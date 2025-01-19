import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { Bell } from 'lucide-react';

const NotificationCenter = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(notificationList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    });
  };

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    
    switch (notification.type) {
      case 'new_message':
        if (notification.courseId) {
          // For course messages, navigate to the training page
          navigate('/training');
        } else {
          // For regular chat messages
          navigate('/messages', { state: { chatId: notification.chatId } });
        }
        break;
      case 'course_response':
        // Navigate to training page for course responses
        navigate('/training');
        break;
      case 'buddy_request':
        navigate('/buddies');
        break;
      default:
        break;
    }
    
    onClose();
  };

  const getNotificationContent = (notification) => {
    switch (notification.type) {
      case 'new_message':
        return {
          icon: '💬',
          title: `New message from ${notification.fromUserName}`,
          preview: notification.messagePreview
        };
      case 'course_response':
        return {
          icon: '📢',
          title: `Response to announcement from ${notification.fromUserName}`,
          preview: notification.messagePreview
        };
      case 'buddy_request':
        return {
          icon: '👥',
          title: `Buddy request from ${notification.fromUserName}`,
          preview: 'Click to view request'
        };
      default:
        return {
          icon: '🔔',
          title: 'New notification',
          preview: 'Click to view'
        };
    }
  };

  return (
    <div className="relative">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 z-[100]"
        onClick={onClose}
      />
      
      {/* Notification Panel */}
      <div className="fixed right-4 top-[4.5rem] w-80 max-h-[80vh] overflow-y-auto bg-white shadow-lg rounded-lg z-[110]">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-gray-500" />
            <h2 className="font-medium">Notifications</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-4 text-center text-gray-500">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No new notifications
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map(notification => {
              const content = getNotificationContent(notification);
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <span className="text-2xl">{content.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{content.title}</p>
                      <p className="text-sm text-gray-600 truncate">{content.preview}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.timestamp?.toDate().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
