import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Search, Users } from 'lucide-react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';

const NewChatModal = ({ isOpen, onClose, onChatCreated }) => {
  const { user } = useAuth();
  const [selectedBuddies, setSelectedBuddies] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBuddies = async () => {
      if (!user || !isOpen) return;

      try {
        setLoading(true);
        setError('');
        
        // Get user's buddy list
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const buddyList = userDoc.data()?.buddyList || {};
        
        // Filter accepted buddies
        const acceptedBuddies = Object.entries(buddyList)
          .filter(([_, data]) => data.status === 'accepted')
          .map(([buddyId]) => buddyId);

        // Fetch buddy profiles
        const buddyPromises = acceptedBuddies.map(async (id) => {
          try {
            const profileDoc = await getDoc(doc(db, 'profiles', id));
            if (profileDoc.exists()) {
              return {
                id,
                ...profileDoc.data()
              };
            }
            return null;
          } catch (err) {
            console.error(`Error fetching buddy ${id}:`, err);
            return null;
          }
        });

        const buddyData = (await Promise.all(buddyPromises))
          .filter(Boolean)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        setBuddies(buddyData);
      } catch (err) {
        console.error('Error fetching buddies:', err);
        setError('Failed to load buddies');
      } finally {
        setLoading(false);
      }
    };

    fetchBuddies();
    // Reset selections when modal opens
    setSelectedBuddies([]);
    setSearchQuery('');
  }, [user, isOpen]);

  const filteredBuddies = buddies.filter(buddy => 
    (buddy.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (buddy.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateChat = async () => {
    if (selectedBuddies.length === 0) return;
    
    try {
      setLoading(true);
      setError('');
      
      const userProfileDoc = await getDoc(doc(db, 'profiles', user.uid));
      const userName = userProfileDoc.exists() ? userProfileDoc.data().name || 'Unknown User' : 'Unknown User';

      const isGroupChat = selectedBuddies.length > 1;
      const participants = {
        [user.uid]: {
          joined: serverTimestamp(),
          active: true,
          displayName: userName // Use name from profile
        }
      };

      // Add selected buddies to participants
      selectedBuddies.forEach(buddyId => {
        const buddy = buddies.find(b => b.id === buddyId);
        participants[buddyId] = {
          joined: serverTimestamp(),
          active: true,
          displayName: buddy?.name || 'Unknown User'  // We already have buddy profiles loaded
        };
      });

      const chatData = {
        type: isGroupChat ? 'group' : 'direct',
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        participants,
        activeParticipants: [user.uid, ...selectedBuddies],
        names: {  // Add this new field to store current names
          [user.uid]: userName,
          ...selectedBuddies.reduce((acc, buddyId) => {
            const buddy = buddies.find(b => b.id === buddyId);
            acc[buddyId] = buddy?.name || 'Unknown User';
            return acc;
          }, {})
        }
      };

      // Add name for group chats
      if (isGroupChat) {
        const participantNames = selectedBuddies
          .map(id => buddies.find(b => b.id === id)?.name || 'Unknown User')
          .join(', ');
        chatData.name = `Group: ${participantNames}`;
      }

      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      onChatCreated(chatRef.id);
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat');
    } finally {
      setLoading(false);
    }
};

  const toggleBuddy = (buddyId) => {
    setSelectedBuddies(current => 
      current.includes(buddyId)
        ? current.filter(id => id !== buddyId)
        : [...current, buddyId]
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                  New Chat
                </Dialog.Title>

                {error && (
                  <div className="mt-2 p-2 text-sm text-red-600 bg-red-50 rounded">
                    {error}
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white">
                    <Search className="text-gray-400" size={20} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search buddies..."
                      className="flex-1 outline-none"
                    />
                  </div>

                  {selectedBuddies.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Users size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {selectedBuddies.length} selected
                      </span>
                    </div>
                  )}

                  <div className="mt-4 max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                      </div>
                    ) : buddies.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No buddies found. Add some buddies first!
                      </p>
                    ) : filteredBuddies.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        No buddies match your search
                      </p>
                    ) : (
                      filteredBuddies.map(buddy => (
                        <label
                          key={buddy.id}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBuddies.includes(buddy.id)}
                            onChange={() => toggleBuddy(buddy.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {buddy.name || 'Unknown User'}
                            </p>
                            {buddy.email && !buddy.hideEmail && (
                              <p className="text-sm text-gray-500">{buddy.email}</p>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateChat}
                    disabled={selectedBuddies.length === 0 || loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-md disabled:bg-blue-300"
                  >
                    {loading ? 'Creating...' : 'Start Chat'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NewChatModal;