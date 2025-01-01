// src/components/Messaging/ChatOptionsModal.js
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export const ChatOptionsModal = ({ 
  isOpen, 
  onClose, 
  onLeaveChat,
  onDeleteChat,
  onViewProfile,
  participantId, 
  participantName,
  isGroup 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

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
                  Chat Options
                </Dialog.Title>

                <div className="space-y-3">
                  {/* Direct Chat Options */}
                  {!isGroup && participantId && (
                    <button
                      onClick={() => {
                        onViewProfile();
                        onClose();
                      }}
                      className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors duration-150"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                      View {participantName || 'Participant'}'s Profile
                    </button>
                  )}

                  {/* Delete Chat Option */}
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
                        setIsDeleting(true);
                        await onDeleteChat();
                        setIsDeleting(false);
                        onClose();
                      }
                    }}
                    disabled={isDeleting}
                    className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {isDeleting ? 'Deleting...' : 'Delete Chat'}
                  </button>

                  {/* Group Chat Leave Option */}
                  {isGroup && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to leave this group chat?')) {
                          onLeaveChat();
                          onClose();
                        }
                      }}
                      className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                      </svg>
                      Leave Group
                    </button>
                  )}

                  {/* Cancel Button */}
                  <button
                    onClick={onClose}
                    className="w-full flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 rounded transition-colors duration-150"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Cancel
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