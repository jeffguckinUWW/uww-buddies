import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { writeBatch } from 'firebase/firestore';

export const BuddyList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buddies, setBuddies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
  }, [searchQuery]);

  const fetchBuddies = async (userId) => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error('User document not found');
        return;
      }
  
      const buddyList = userDoc.data()?.buddyList || {};
      
      // Only fetch accepted buddies
      const acceptedBuddies = Object.entries(buddyList)
        .filter(([_, data]) => data.status === 'accepted');
      
      if (acceptedBuddies.length === 0) {
        setBuddies([]);
        return;
      }
  
      // Fetch full user data for each buddy
      const buddyPromises = acceptedBuddies.map(async ([buddyId]) => {
        try {
          // Get user and profile data
          const [userDoc, profileDoc] = await Promise.all([
            getDoc(doc(db, 'users', buddyId)),
            getDoc(doc(db, 'profiles', buddyId))
          ]);
  
          if (userDoc.exists() && profileDoc.exists()) {
            return {
              id: buddyId,
              ...userDoc.data(),
              ...profileDoc.data()
            };
          }
          console.warn(`Buddy ${buddyId} documents not found`);
          return null;
        } catch (err) {
          console.error(`Error fetching buddy ${buddyId}:`, err);
          return null;
        }
      });
  
      const buddyData = (await Promise.all(buddyPromises))
        .filter(Boolean)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  
      setBuddies(buddyData);
    } catch (err) {
      console.error('Error fetching buddies:', err);
      setError('Failed to load buddy list');
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const searchUsers = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Search in profiles collection
      const profilesRef = collection(db, 'profiles');
      const querySnapshot = await getDocs(profilesRef);
      const users = [];

      for (const doc of querySnapshot.docs) {
        // Don't include current user in search results
        if (doc.id !== user.uid) {
          const profileData = doc.data();
          
          // Check if name or email contains search query (case insensitive)
          const searchLower = searchQuery.toLowerCase();
          const nameMatch = profileData.name?.toLowerCase().includes(searchLower);
          const emailMatch = profileData.email?.toLowerCase().includes(searchLower);
          
          if (nameMatch || emailMatch) {
            users.push({ 
              id: doc.id,
              ...profileData
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
  };

  // In BuddyList.js - Update the sendBuddyRequest function

const sendBuddyRequest = async (buddyId) => {
  if (!user) return;
  
  try {
    setLoading(true);
    setError('');
    
    // Get current user's profile
    const userProfileDoc = await getDoc(doc(db, 'profiles', user.uid));
    const userProfile = userProfileDoc.data();
    
    // Check if request already exists
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const buddyList = userDoc.data()?.buddyList || {};
    
    if (buddyList[buddyId]) {
      setError('Buddy request already sent or exists');
      return;
    }

    const batch = writeBatch(db);

    // Update sender's buddy list
    const senderRef = doc(db, 'users', user.uid);
    batch.update(senderRef, {
      [`buddyList.${buddyId}`]: {
        status: 'pending',
        timestamp: serverTimestamp(),
        initiator: true
      }
    });

    // Update recipient's buddy list
    const recipientRef = doc(db, 'users', buddyId);
    batch.update(recipientRef, {
      [`buddyList.${user.uid}`]: {
        status: 'pending',
        timestamp: serverTimestamp(),
        initiator: false
      }
    });

    // Create notification with profile info
    const notificationRef = collection(db, 'notifications');
    batch.set(doc(notificationRef), {
      type: 'buddy_request',
      fromUser: user.uid,
      fromUserName: userProfile?.name || user.displayName || user.email,
      fromUserProfile: {
        certificationLevel: userProfile?.certificationLevel || null,
        numberOfDives: userProfile?.numberOfDives || 0,
        location: userProfile?.location || null,
        specialties: userProfile?.specialties || [],
        email: userProfile?.hideEmail ? null : userProfile?.email
      },
      toUser: buddyId,
      timestamp: serverTimestamp(),
      read: false
    });

    await batch.commit();
    setFilteredUsers(users => users.filter(u => u.id !== buddyId));
  } catch (err) {
    console.error('Error sending buddy request:', err);
    setError('Failed to send buddy request');
  } finally {
    setLoading(false);
  }
};

  // Start chat with buddy
  const startChat = async (buddyId) => {
    try {
      setLoading(true);
      
      const chatRef = await addDoc(collection(db, 'messages'), {
        type: 'direct',
        participants: {
          [user.uid]: { joined: serverTimestamp(), active: true },
          [buddyId]: { joined: serverTimestamp(), active: true }
        },
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      });

      navigate('/messages', { state: { chatId: chatRef.id } });
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
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

      {/* Search Results */}
      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Search Results</h3>
          {filteredUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
              <div>
                <p className="font-medium">{user.name || 'Unnamed User'}</p>
                {!user.hideEmail && user.email && (
                  <p className="text-sm text-gray-600">{user.email}</p>
                )}
                {user.certificationLevel && (
                  <p className="text-sm text-gray-600">
                    Certification: {user.certificationLevel}
                  </p>
                )}
                {user.numberOfDives > 0 && (
                  <p className="text-sm text-gray-600">
                    Dives: {user.numberOfDives}
                  </p>
                )}
              </div>
              <button
                onClick={() => sendBuddyRequest(user.id)}
                className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-green-300 hover:bg-green-600"
                disabled={loading}
              >
                Add Buddy
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {!loading && searchQuery.length >= 2 && filteredUsers.length === 0 && (
        <div className="text-center py-4 text-gray-500">
          No users found matching your search
        </div>
      )}

      {/* Buddy List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">My Buddies</h3>
        {loading && buddies.length === 0 ? (
          <p className="text-gray-500">Loading buddies...</p>
        ) : buddies.length === 0 ? (
          <p className="text-gray-500">No buddies yet</p>
        ) : (
          buddies.map(buddy => (
            <div key={buddy.id} className="flex items-center justify-between p-2 border-b hover:bg-gray-50">
              <div>
                <p className="font-medium">{buddy.name || 'Unknown User'}</p>
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
              <button
                onClick={() => startChat(buddy.id)}
                className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-blue-300 hover:bg-blue-600"
                disabled={loading}
              >
                Message
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};