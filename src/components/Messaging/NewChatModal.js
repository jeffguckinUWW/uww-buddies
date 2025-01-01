// src/components/Messaging/NewChatModal.js
import React, { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';

export const NewChatModal = ({ isOpen, onClose, onCreateChat }) => {
  const { user } = useAuth();
  const [selectedBuddies, setSelectedBuddies] = useState([]);
  const [buddies, setBuddies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user's buddies
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
            const buddyDoc = await getDoc(doc(db, 'users', id));
            const profileDoc = await getDoc(doc(db, 'profiles', id));
            if (buddyDoc.exists()) {
              return {
                id,
                ...buddyDoc.data(),
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
          .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

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
    (buddy.displayName || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const handleCreateChat = async () => {
    if (selectedBuddies.length === 0) return;
    
    try {
      setLoading(true);
      setError('');
      await onCreateChat(selectedBuddies, selectedBuddies.length > 1);
      onClose();
    } catch (err) {
      console.error('Error creating chat:', err);
      setError('Failed to create chat');
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
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  New Message
                </Dialog.Title>

                {error && (
                  <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 rounded">
                    {error}
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Buddies
                    </label>
                    {selectedBuddies.length > 0 && (
                      <span className="text-sm text-gray-500">
                        {selectedBuddies.length} selected
                      </span>
                    )}
                  </div>

                  {/* Search Input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search buddies..."
                    className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="animate-pulse flex items-center p-2">
                          <div className="h-4 w-4 bg-gray-200 rounded mr-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : buddies.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No buddies available. Add some buddies first!
                    </p>
                  ) : filteredBuddies.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No buddies match your search
                    </p>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {filteredBuddies.map(buddy => (
                        <label
                          key={buddy.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBuddies.includes(buddy.id)}
                            onChange={() => toggleBuddy(buddy.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-900">{buddy.displayName || 'Unknown User'}</span>
                              {buddy.certificationLevel && (
                                <span className="text-sm text-gray-500">
                                  {buddy.certificationLevel}
                                </span>
                              )}
                            </div>
                            {buddy.numberOfDives && (
                              <span className="text-xs text-gray-500">
                                {buddy.numberOfDives} dives
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateChat}
                    disabled={loading || selectedBuddies.length === 0}
                    className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                      ${loading || selectedBuddies.length === 0
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                      }`}
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