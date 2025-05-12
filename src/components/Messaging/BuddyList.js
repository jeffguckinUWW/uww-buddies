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
  const [activeTab, setActiveTab] = useState('buddies');
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

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
      const userRef = doc(db, 'profiles', userId);
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
  
  // Helper function to render a buddy card with improved styling
  const renderBuddyCard = (buddy, buttons) => (
    <div key={buddy.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 border-b hover:bg-gray-50 transition-colors">
      <div 
        className="flex-grow cursor-pointer mb-2 md:mb-0 w-full md:w-auto"
        onClick={() => navigate(`/buddy/${buddy.id}`)}
      >
        <div className="flex items-center">
          {buddy.photoURL && buddy.photoURL.trim() !== '' ? (
            <img 
              src={buddy.photoURL} 
              alt={buddy.name || 'User'} 
              className="w-10 h-10 rounded-full mr-3 object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.parentNode.querySelector('.fallback-avatar').style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`w-10 h-10 rounded-full mr-3 bg-blue-100 flex items-center justify-center fallback-avatar ${buddy.photoURL && buddy.photoURL.trim() !== '' ? 'hidden' : ''}`}
          >
            <span className="text-sm font-medium text-blue-600">
              {buddy.name && buddy.name.trim() !== '' ? buddy.name.trim()[0].toUpperCase() : '?'}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-800">{buddy.name || 'Unknown User'}</p>
            {!buddy.hideEmail && buddy.email && (
              <p className="text-xs text-gray-500">{buddy.email}</p>
            )}
          </div>
        </div>
        <div className="mt-2 pl-12">
          <Badges
            certificationLevel={buddy.certificationLevel}
            specialties={buddy.specialties}
            numberOfDives={buddy.numberOfDives}
            size="small"
            showSections={false}
          />
          <div className="flex flex-wrap gap-2 mt-1">
            {buddy.certificationLevel && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {buddy.certificationLevel}
              </span>
            )}
            {buddy.numberOfDives > 0 && (
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {buddy.numberOfDives} dives
              </span>
            )}
          </div>
        </div>
      </div>
      <div className={`flex ${isSmallScreen ? 'flex-col w-full space-y-2' : 'space-x-2'}`}>
        <button
          onClick={() => navigate(`/buddy/${buddy.id}`)}
          className={`text-xs py-1.5 px-3 bg-gray-100 text-gray-700 rounded border border-gray-200 hover:bg-gray-200 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
        >
          View Profile
        </button>
        {buttons}
      </div>
    </div>
  );

  // Tab navigation for mobile
  const renderTabs = () => (
    <div className="mb-4 border-b">
      <div className="flex">
        <button
          onClick={() => setActiveTab('buddies')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'buddies' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          My Buddies {buddies.length > 0 && `(${buddies.length})`}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'requests' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Requests {(pendingIncoming.length + pendingOutgoing.length) > 0 && 
            `(${pendingIncoming.length + pendingOutgoing.length})`}
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'search' 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'}`}
        >
          Find Buddies
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-3 md:p-4 bg-white md:shadow-sm md:rounded-lg">
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">{error}</div>
      )}

      {isSmallScreen && renderTabs()}

      {/* Search Bar - Always visible on desktop, only on search tab on mobile */}
      {(!isSmallScreen || activeTab === 'search') && (
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 pl-9 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              disabled={loading}
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery.length === 1 && (
            <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search</p>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto" />
        </div>
      )}

      {/* Search Results */}
      {!loading && filteredUsers.length > 0 && (!isSmallScreen || activeTab === 'search') && (
        <div className="mb-6">
          <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Search Results</h3>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            {filteredUsers.map(user => renderBuddyCard(user, (
              user.buddyStatus === 'none' ? (
                <button
                  onClick={() => sendBuddyRequest(user.id)}
                  className={`text-xs py-1.5 px-3 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                  disabled={loading}
                >
                  Add Buddy
                </button>
              ) : user.buddyStatus === 'pending' ? (
                <div className="text-xs py-1.5 px-3 bg-gray-50 text-gray-500 rounded border border-gray-200">
                  Request Pending
                </div>
              ) : (
                <div className="text-xs py-1.5 px-3 bg-green-50 text-green-700 rounded border border-green-200">
                  Already Buddies
                </div>
              )
            )))}
          </div>
        </div>
      )}

      {!loading && searchQuery.length >= 2 && filteredUsers.length === 0 && (!isSmallScreen || activeTab === 'search') && (
        <div className="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
          No users found matching your search
        </div>
      )}

      {/* Incoming Buddy Requests */}
      {pendingIncoming.length > 0 && (!isSmallScreen || activeTab === 'requests') && (
        <div className="mb-6">
          <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Incoming Buddy Requests</h3>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            {pendingIncoming.map(buddy => renderBuddyCard(buddy, (
              <div className={`flex ${isSmallScreen ? 'flex-col space-y-2 w-full' : 'space-x-2'}`}>
                <button
                  onClick={() => handleBuddyRequest(buddy.id, true)}
                  className={`text-xs py-1.5 px-3 bg-green-50 text-green-700 rounded border border-green-200 hover:bg-green-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                  disabled={loading}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleBuddyRequest(buddy.id, false)}
                  className={`text-xs py-1.5 px-3 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                  disabled={loading}
                >
                  Decline
                </button>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* Pending Outgoing Requests */}
      {pendingOutgoing.length > 0 && (!isSmallScreen || activeTab === 'requests') && (
        <div className="mb-6">
          <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">Pending Requests</h3>
          <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
            {pendingOutgoing.map(buddy => renderBuddyCard(buddy, (
              <div className="text-xs py-1.5 px-3 bg-gray-50 text-gray-500 rounded border border-gray-200">
                Awaiting Response
              </div>
            )))}
          </div>
        </div>
      )}

      {/* Accepted Buddies */}
      {(!isSmallScreen || activeTab === 'buddies') && (
        <div>
          <h3 className="text-sm uppercase font-semibold text-gray-500 mb-2 tracking-wider">My Buddies</h3>
          {loading && buddies.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">Loading buddies...</p>
          ) : buddies.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 text-sm mb-2">No buddies yet</p>
              <button 
                onClick={() => isSmallScreen ? setActiveTab('search') : null}
                className="text-xs py-1.5 px-4 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Find Buddies
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              {buddies.map(buddy => renderBuddyCard(buddy, (
                <div className={`flex ${isSmallScreen ? 'flex-col space-y-2 w-full' : 'space-x-2'}`}>
                  <button
                    onClick={() => startChat(buddy.id)}
                    className={`text-xs py-1.5 px-3 bg-blue-50 text-blue-700 rounded border border-blue-200 hover:bg-blue-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                    disabled={loading}
                  >
                    Message
                  </button>
                  <button
                    onClick={() => removeBuddy(buddy.id)}
                    className={`text-xs py-1.5 px-3 bg-red-50 text-red-700 rounded border border-red-200 hover:bg-red-100 transition-colors ${isSmallScreen ? 'w-full' : ''}`}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              )))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BuddyList;