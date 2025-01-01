// src/components/Messaging/ChatHeader.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ChatOptionsModal } from './ChatOptionsModal';

export const ChatHeader = ({ chat, onLeaveChat, onDeleteChat }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchParticipants = async () => {
      if (!chat || !user) return;

      try {
        setLoading(true);
        setError('');
        const participantIds = chat.activeParticipants || [];

        const participantPromises = participantIds.map(async (userId) => {
          try {
            const [userDoc, profileDoc] = await Promise.all([
              getDoc(doc(db, 'users', userId)),
              getDoc(doc(db, 'profiles', userId))
            ]);
            
            if (userDoc.exists() && profileDoc.exists()) {
              return {
                id: userId,
                ...userDoc.data(),
                ...profileDoc.data()
              };
            }
            return null;
          } catch (err) {
            console.error(`Error fetching participant ${userId}:`, err);
            return null;
          }
        });

        const participantData = (await Promise.all(participantPromises))
          .filter(Boolean);
        setParticipants(participantData);
      } catch (err) {
        console.error('Error fetching participants:', err);
        setError('Failed to load participants');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [chat, user]);

  const getChatTitle = () => {
    if (!chat) return '';
    if (!participants.length) return 'Loading...';
    
    const otherParticipants = participants
      .filter(p => p.id !== user?.uid)
      .map(p => p.displayName || p.name || 'Unknown User');

    if (chat.type === 'direct') {
      return otherParticipants[0] || 'Unknown User';
    }

    return `Group: ${otherParticipants.join(', ')}`;
  };

  const getDirectChatParticipant = () => {
    if (chat?.type === 'direct') {
      const otherParticipant = participants.find(p => p.id !== user?.uid);
      return {
        id: otherParticipant?.id,
        name: otherParticipant?.displayName || otherParticipant?.name || 'Unknown User'
      };
    }
    return null;
  };

  const handleViewProfile = () => {
    const participant = getDirectChatParticipant();
    if (participant?.id) {
      navigate(`/buddy/${participant.id}`);
      setShowOptionsModal(false);
    }
  };

  const handleParticipantClick = (participantId) => {
    if (participantId !== user?.uid) {
      navigate(`/buddy/${participantId}`);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      {!chat ? ( // Add this check
        <div className="text-gray-500">No chat selected</div>
      ) : error ? (
        <div className="text-red-500 text-sm">{error}</div>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium truncate">
              {loading ? (
                <div className="animate-pulse h-6 bg-gray-200 rounded w-48"></div>
              ) : (
                getChatTitle()
              )}
            </h2>
            {!loading && chat?.type === 'group' && (
              <div className="text-sm text-gray-500">
                <p className="mb-1">{participants.length} participants</p>
                <div className="flex flex-wrap gap-1">
                  {participants
                    .filter(p => p.id !== user?.uid)
                    .map(participant => (
                      <button
                        key={participant.id}
                        onClick={() => handleParticipantClick(participant.id)}
                        className="text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        {participant.displayName || participant.name || 'Unknown User'}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
  
          {/* Only show options button if chat exists */}
          <button
            onClick={() => setShowOptionsModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="Chat options"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
            </svg>
          </button>
  
          <ChatOptionsModal 
            isOpen={showOptionsModal}
            onClose={() => setShowOptionsModal(false)}
            onLeaveChat={onLeaveChat}
            onDeleteChat={onDeleteChat}
            onViewProfile={handleViewProfile}
            participantId={getDirectChatParticipant()?.id}
            participantName={getDirectChatParticipant()?.name}
            isGroup={chat?.type === 'group'}
          />
        </>
      )}
    </div>
  );
};