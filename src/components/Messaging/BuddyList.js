import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs,  
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp,
  writeBatch,
  deleteField,
  query,
  where
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import Badges from '../../components/Profile/Badges';
import NotificationService from '../../services/NotificationService';

export const BuddyList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState([]);
  const [pendingOutgoing, setPendingOutgoing] = useState([]);
  const [pendingIncoming, setPendingIncoming] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mark buddy notifications as read when component mounts
  useEffect(() => {
    const markBuddyNotificationsAsRead = async () => {
      if (!user) return;
      
      try {
        // Get all buddy request notifications
        const q = query(
          collection(db, 'notifications'),
          where('toUser', '==', user.uid),
          where('read', '==', false),
          where('type', '==', 'buddy_request')
        );
        
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} buddy request notifications to mark as read`);
        
        // Mark each as read
        for (const doc of snapshot.docs) {
          await NotificationService.markNotificationAsRead(doc.id, user.uid);
        }
      } catch (err) {
        console.error('Error marking buddy notifications as read:', err);
      }
    };
    
    markBuddyNotificationsAsRead();
  }, [user]);

  // Search users - Defined before it's used
  const searchUsers = useCallback(async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    try {
      setLoading(true);
      setError('');
      
      // First get the current user's buddy list
      const userProfileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const currentUserBuddyList = userProfileDoc.data()?.buddyList || {};
      
      const profilesRef = collection(db, 'profiles');
      const querySnapshot = await getDocs(profilesRef);
      const users = [];
  
      for (const doc of querySnapshot.docs) {
        if (doc.id !== user.uid) {
          const profileData = doc.data();
          
          const searchLower = searchQuery.toLowerCase();
          const nameMatch = profileData.name?.toLowerCase().includes(searchLower);
          const emailMatch = profileData.email?.toLowerCase().includes(searchLower);
          
          if (nameMatch || emailMatch) {
            // Add buddy status to the user object
            const buddyStatus = currentUserBuddyList[doc.id]?.status || 'none';
            
            users.push({ 
              id: doc.id,
              ...profileData,
              buddyStatus
            });
          }
        }
      }
  
      setFilteredUsers(users);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.uid]);

  // Fetch user's buddy list
  useEffect(() => {
    if (user) {
      fetchBuddies(user.uid);
    }
  }, [user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchUsers();
      } else {
        setFilteredUsers([]);
      }
    }, 300);
  
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const fetchBuddies = async (userId) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'profiles', userId); // Changed from 'users' to 'profiles'
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('User profile document not found');
        return;
      }
  
      const buddyList = userDoc.data()?.buddyList || {};
      
      // Separate buddies into accepted, outgoing, and incoming
      const accepted = [];
      const outgoing = [];
      const incoming = [];

      // Process all buddy relationships
      const buddyPromises = Object.entries(buddyList).map(async ([buddyId, data]) => {
        try {
          // Get profile data
          const profileDoc = await getDoc(doc(db, 'profiles', buddyId));
  
          if (profileDoc.exists()) {
            const buddyData = {
              id: buddyId,
              ...profileDoc.data(),
              requestStatus: data.status,
              initiator: data.initiator
            };

            // Sort into appropriate arrays
            if (data.status === 'accepted') {
              accepted.push(buddyData);
            } else if (data.status === 'pending') {
              if (data.initiator) {
                outgoing.push(buddyData);
              } else {
                incoming.push(buddyData);
              }
            }
          }
          return null;
        } catch (err) {
          console.error(`Error fetching buddy ${buddyId}:`, err);
          return null;
        }
      });
  
      await Promise.all(buddyPromises);
  
      // Sort arrays by name
      const sortByName = (a, b) => (a.name || '').localeCompare(b.name || '');
      setBuddies(accepted.sort(sortByName));
      setPendingOutgoing(outgoing.sort(sortByName));
      setPendingIncoming(incoming.sort(sortByName));
    } catch (err) {
      console.error('Error fetching buddies:', err);
      setError('Failed to load buddy list');
    } finally {
      setLoading(false);
    }
  };

  const handleBuddyRequest = async (buddyId, accept) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      const batch = writeBatch(db);

      if (accept) {
        // Update both users' buddy lists to accepted status
        const userRef = doc(db, 'profiles', user.uid); 
        const buddyRef = doc(db, 'profiles', buddyId);
        
        batch.update(userRef, {
          [`buddyList.${buddyId}.status`]: 'accepted'
        });
        
        batch.update(buddyRef, {
          [`buddyList.${user.uid}.status`]: 'accepted'
        });
      } else {
        // Remove buddy entries for both users
        const userRef = doc(db, 'profiles', user.uid);
        const buddyRef = doc(db, 'profiles', buddyId);
        
        batch.update(userRef, {
          [`buddyList.${buddyId}`]: deleteField()
        });
        
        batch.update(buddyRef, {
          [`buddyList.${user.uid}`]: deleteField()
        });
      }

      await batch.commit();
      
      // Refresh buddy lists
      fetchBuddies(user.uid);
    } catch (err) {
      console.error('Error handling buddy request:', err);
      setError('Failed to process buddy request');
    } finally {
      setLoading(false);
    }
  };

  const sendBuddyRequest = async (buddyId) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Get current user's profile
      const userProfileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const userProfile = userProfileDoc.data();
      
      // Check if request already exists
      const buddyList = userProfile?.buddyList || {};
      
      if (buddyList[buddyId]) {
        setError('Buddy request already sent or exists');
        return;
      }

      const batch = writeBatch(db);

      // Update sender's buddy list
      const senderRef = doc(db, 'profiles', user.uid);
      batch.update(senderRef, {
        [`buddyList.${buddyId}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: true
        }
      });

      // Update recipient's buddy list
      const recipientRef = doc(db, 'profiles', buddyId);
      batch.update(recipientRef, {
        [`buddyList.${user.uid}`]: {
          status: 'pending',
          timestamp: serverTimestamp(),
          initiator: false
        }
      });

      // Create notification
      await batch.commit();

      // Then create the notification using NotificationService
      import('../../services/NotificationService').then(module => {
        const NotificationService = module.default;
        NotificationService.createBuddyRequestNotification({
          fromUser: user.uid,
          fromUserName: userProfile?.name || user.displayName || user.email,
          toUser: buddyId,
          requestId: user.uid // Using sender ID as request ID
        });
      });
      
      // Refresh buddy lists
      fetchBuddies(user.uid);
    } catch (err) {
      console.error('Error sending buddy request:', err);
      setError('Failed to send buddy request');
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (buddyId) => {
    try {
      setLoading(true);
      
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'direct',
        participants: {
          [user.uid]: { 
            joined: serverTimestamp(), 
            active: true,
            displayName: user.displayName || 'Unknown User'
          },
          [buddyId]: { 
            joined: serverTimestamp(), 
            active: true,
            displayName: buddies.find(b => b.id === buddyId)?.name || 'Unknown User'
          }
        },
        activeParticipants: [user.uid, buddyId],
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        lastMessageAt: serverTimestamp()
      });
  
      navigate('/messages', { state: { chatId: chatRef.id } });
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };
  
  const removeBuddy = async (buddyId) => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to remove this buddy? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const batch = writeBatch(db);
      
      // Remove buddy from current user's list
      const userRef = doc(db, 'profiles', user.uid);
      batch.update(userRef, {
        [`buddyList.${buddyId}`]: deleteField()
      });
      
      // Remove current user from buddy's list
      const buddyRef = doc(db, 'profiles', buddyId);
      batch.update(buddyRef, {
        [`buddyList.${user.uid}`]: deleteField()
      });
      
      await batch.commit();
      
      // Refresh buddy list
      fetchBuddies(user.uid);
      
    } catch (err) {
      console.error('Error removing buddy:', err);
      setError('Failed to remove buddy');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to render a buddy card with consistent layout
  const renderBuddyCard = (buddy, buttons) => (
    <div key={buddy.id} className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
      <div 
        className="flex-grow cursor-pointer"
        onClick={() => navigate(`/buddy/${buddy.id}`)}
      >
        <p className="font-medium">{buddy.name || 'Unknown User'}</p>
        <Badges
          certificationLevel={buddy.certificationLevel}
          specialties={buddy.specialties}
          numberOfDives={buddy.numberOfDives}
          size="small"
          showSections={false}
        />
        {!buddy.hideEmail && buddy.email && (
          <p className="text-sm text-gray-600">{buddy.email}</p>
        )}
        {buddy.certificationLevel && (
          <p className="text-sm text-gray-600">
            Certification: {buddy.certificationLevel}
          </p>
        )}
        {buddy.numberOfDives > 0 && (
          <p className="text-sm text-gray-600">
            Dives: {buddy.numberOfDives}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/buddy/${buddy.id}`)}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          View Profile
        </button>
        {buttons}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          disabled={loading}
        />
        {searchQuery.length === 1 && (
          <p className="text-sm text-gray-500 mt-1">Type at least 2 characters to search</p>
        )}
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        </div>
      )}

      {/* Search Results */}
      {!loading && filteredUsers.length > 0 && (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-2">Search Results</h3>
    {filteredUsers.map(user => renderBuddyCard(user, (
      user.buddyStatus === 'none' ? (
        <button
          onClick={() => sendBuddyRequest(user.id)}
          className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-green-300 hover:bg-green-600"
          disabled={loading}
        >
          Add Buddy
        </button>
      ) : user.buddyStatus === 'pending' ? (
        <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded">
          Request Pending
        </div>
      ) : (
        <div className="px-3 py-1 bg-blue-100 text-blue-600 rounded">
          Already Buddies
        </div>
      )
    )))}
  </div>
)}

      {!loading && searchQuery.length >= 2 && filteredUsers.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No users found matching your search
        </div>
      )}

      {/* Incoming Buddy Requests */}
      {pendingIncoming.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Incoming Buddy Requests</h3>
          {pendingIncoming.map(buddy => renderBuddyCard(buddy, (
            <>
              <button
                onClick={() => handleBuddyRequest(buddy.id, true)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={loading}
              >
                Accept
              </button>
              <button
                onClick={() => handleBuddyRequest(buddy.id, false)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={loading}
              >
                Decline
              </button>
            </>
          )))}
        </div>
      )}

      {/* Pending Outgoing Requests */}
      {pendingOutgoing.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Pending Requests</h3>
          {pendingOutgoing.map(buddy => renderBuddyCard(buddy, (
            <div className="px-3 py-1 bg-gray-100 text-gray-600 rounded">
              Awaiting Response
            </div>
          )))}
        </div>
      )}

      {/* Accepted Buddies */}
      <div>
        <h3 className="text-lg font-semibold mb-2">My Buddies</h3>
        {loading && buddies.length === 0 ? (
          <p className="text-gray-500">Loading buddies...</p>
        ) : buddies.length === 0 ? (
          <p className="text-gray-500">No buddies yet</p>
        ) : (
          buddies.map(buddy => renderBuddyCard(buddy, (
            <div className="flex gap-2">
              <button
                onClick={() => startChat(buddy.id)}
                className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-green-300 hover:bg-green-600"
                disabled={loading}
              >
                Message
              </button>
              <button
                onClick={() => removeBuddy(buddy.id)}
                className="px-3 py-1 bg-red-500 text-white rounded disabled:bg-red-300 hover:bg-red-600"
                disabled={loading}
              >
                Remove
              </button>
            </div>
          )))
        )}
      </div>
    </div>
  );
};

export default BuddyList;