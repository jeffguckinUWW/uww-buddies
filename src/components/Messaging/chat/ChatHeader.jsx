import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import ChatOptionsModal from './ChatOptionsModal';

const ChatHeader = ({ chatId, onDeleteChat }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChat = async () => {
      if (!chatId) return;

      try {
        setLoading(true);
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        
        if (chatDoc.exists()) {
          setChat({ id: chatDoc.id, ...chatDoc.data() });
        } else {
          setError('Chat not found');
        }
      } catch (err) {
        console.error('Error fetching chat:', err);
        setError('Failed to load chat details');
      } finally {
        setLoading(false);
      }
    };

    fetchChat();
  }, [chatId]);

  const getChatTitle = () => {
    if (loading) return 'Loading...';
    if (error) return 'Error loading chat';
    if (!chat) return '';

    if (chat.type === 'group') return chat.name;
    
    const otherParticipant = Object.entries(chat.participants || {})
      .find(([id]) => id !== user?.uid)?.[1];
      
    return otherParticipant?.displayName || 'Unknown User';
  };

  const getParticipantCount = () => {
    if (!chat?.participants) return 0;
    return Object.values(chat.participants)
      .filter(p => p.active).length;
  };

  // Get other participant for direct chat options
  const getOtherParticipant = () => {
    if (!chat || chat.type === 'group' || !chat.participants) return null;
    
    const otherParticipantEntry = Object.entries(chat.participants)
      .find(([id]) => id !== user?.uid);
      
    if (!otherParticipantEntry) return null;
    
    return {
      id: otherParticipantEntry[0],
      ...otherParticipantEntry[1]
    };
  };

  const handleDeleteChat = () => {
    if (typeof onDeleteChat === 'function') {
      onDeleteChat();
    }
    setShowOptions(false);
  };

  const handleViewProfile = (userId) => {
    navigate(`/buddy/${userId}`);
    setShowOptions(false);
  };

  const otherParticipant = getOtherParticipant();

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-medium text-gray-900 truncate">
          {getChatTitle()}
        </h2>
        {chat?.type === 'group' && (
          <p className="text-sm text-gray-500">
            {getParticipantCount()} participants
          </p>
        )}
      </div>

      <button
        onClick={() => setShowOptions(true)}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
      >
        <MoreVertical size={20} />
      </button>

      <ChatOptionsModal
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        onDeleteChat={handleDeleteChat}
        onLeaveChat={handleDeleteChat} // Same function for now
        onViewProfile={otherParticipant ? () => handleViewProfile(otherParticipant.id) : undefined}
        participantId={otherParticipant?.id}
        participantName={otherParticipant?.displayName}
        isGroup={chat?.type === 'group'}
      />
    </div>
  );
};

export default ChatHeader;