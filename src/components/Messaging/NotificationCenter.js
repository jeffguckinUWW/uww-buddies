import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc,
  writeBatch, 
  serverTimestamp, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const notificationRef = useRef(null);

  useEffect(() => {
    console.log('Fetching notifications for user:', user?.uid);

    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('toUser', '==', user.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('Notification snapshot:', snapshot.docs);
        const notificationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('Notification list:', notificationList);
        setNotifications(notificationList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching notifications:', err);
        setError('Failed to load notifications');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleBuddyRequest = async (notificationId, accepted) => {
    if (!user) return;
  
    try {
      setLoading(true);
      setError('');
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) {
        setError('Notification not found');
        return;
      }
  
      const batch = writeBatch(db);
  
      // Get current user's profile for the acceptance notification
      const userProfileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const userProfile = userProfileDoc.data();

      // Update buddy status for both users
      const currentUserRef = doc(db, 'users', user.uid);
      const requestingUserRef = doc(db, 'users', notification.fromUser);
  
      if (accepted) {
        // Update current user's buddy list
        batch.update(currentUserRef, {
          [`buddyList.${notification.fromUser}`]: {
            status: 'accepted',
            timestamp: serverTimestamp(),
            initiator: false
          }
        });
  
        // Update requesting user's buddy list
        batch.update(requestingUserRef, {
          [`buddyList.${user.uid}`]: {
            status: 'accepted',
            timestamp: serverTimestamp(),
            initiator: true
          }
        });
  
        // Create acceptance notification with profile details
        const acceptanceNotificationRef = collection(db, 'notifications');
        batch.set(doc(acceptanceNotificationRef), {
          type: 'buddy_request_accepted',
          fromUser: user.uid,
          fromUserName: userProfile?.name || user.displayName || user.email,
          fromUserProfile: {
            certificationLevel: userProfile?.certificationLevel || null,
            numberOfDives: userProfile?.numberOfDives || 0,
            location: userProfile?.location || null,
            specialties: userProfile?.specialties || []
          },
          toUser: notification.fromUser,
          timestamp: serverTimestamp(),
          read: false
        });
      } else {
        // If rejected, update status
        batch.update(currentUserRef, {
          [`buddyList.${notification.fromUser}`]: {
            status: 'rejected',
            timestamp: serverTimestamp(),
            initiator: false
          }
        });
  
        batch.update(requestingUserRef, {
          [`buddyList.${user.uid}`]: {
            status: 'rejected',
            timestamp: serverTimestamp(),
            initiator: true
          }
        });
      }
  
      // Mark original notification as read
      const notificationRef = doc(db, 'notifications', notificationId);
      batch.update(notificationRef, {
        read: true
      });
  
      await batch.commit();
  
    } catch (err) {
      console.error('Error handling buddy request:', err);
      setError('Failed to process buddy request');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    if (!user) return;

    try {
      setLoading(true);
      setError('');
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
      if (onClose) onClose();
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to mark notification as read');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageNotification = async (notificationId, messageId) => {
    try {
      await markAsRead(notificationId);
      navigate('/messages', { state: { chatId: messageId } });
      if (onClose) onClose();
    } catch (err) {
      console.error('Error handling message notification:', err);
      setError('Failed to open message');
    }
  };

  const handleViewProfile = (userId) => {
    navigate(`/buddy/${userId}`);
    if (onClose) onClose();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * oneDay) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[100]"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div 
      ref={notificationRef}
      className="fixed right-4 top-[4.5rem] w-80 max-h-[80vh] overflow-y-auto bg-white shadow-lg rounded-lg z-[110]"
      onClick={(e) => e.stopPropagation()}
      >
        {error && (
          <div className="p-2 bg-red-100 text-red-700 text-sm rounded-t-lg">
            {error}
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map(notification => (
              <div key={notification.id}>
                {notification.type === 'buddy_request' && (
                  <div className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-blue-600">
                            {notification.fromUserName?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 mb-1">
                          Buddy Request from {notification.fromUserName || 'Unknown User'}
                        </p>
                        {notification.fromUserProfile && (
                          <div className="text-sm text-gray-600 mb-2 space-y-1">
                            {notification.fromUserProfile.certificationLevel && (
                              <p>Certification: {notification.fromUserProfile.certificationLevel}</p>
                            )}
                            {notification.fromUserProfile.numberOfDives > 0 && (
                              <p>Total Dives: {notification.fromUserProfile.numberOfDives}</p>
                            )}
                            {notification.fromUserProfile.location && (
                              <p>Location: {notification.fromUserProfile.location}</p>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex space-x-3">
                          <button
                            onClick={() => handleBuddyRequest(notification.id, true)}
                            className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:bg-green-300"
                            disabled={loading}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleBuddyRequest(notification.id, false)}
                            className="flex-1 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:bg-red-300"
                            disabled={loading}
                          >
                            Decline
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {notification.type === 'buddy_request_accepted' && (
                  <div className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          <span className="text-green-600 font-semibold">{notification.fromUserName}</span> accepted your buddy request!
                        </p>
                        {notification.fromUserProfile && (
                          <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                            {notification.fromUserProfile.certificationLevel && (
                              <p>Certification: {notification.fromUserProfile.certificationLevel}</p>
                            )}
                            {notification.fromUserProfile.numberOfDives > 0 && (
                              <p>Total Dives: {notification.fromUserProfile.numberOfDives}</p>
                            )}
                            {notification.fromUserProfile.location && (
                              <p>Location: {notification.fromUserProfile.location}</p>
                            )}
                          </div>
                        )}
                        <div className="mt-3 flex justify-between">
                          <button
                            onClick={() => handleViewProfile(notification.fromUser)}
                            className="text-blue-500 hover:text-blue-600 font-medium text-sm"
                          >
                            View Profile
                          </button>
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-gray-500 hover:text-gray-600 text-sm"
                          >
                            Dismiss
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {notification.type === 'new_message' && (
                  <div className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {notification.chatType === 'group' 
                            ? `New message in ${notification.chatName}`
                            : `New message from ${notification.fromUserName}`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.messagePreview || 'New message'}
                        </p>
                        <div className="mt-3">
                          <button
                            onClick={() => handleMessageNotification(notification.id, notification.messageId)}
                            className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                            disabled={loading}
                          >
                            View Conversation
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}