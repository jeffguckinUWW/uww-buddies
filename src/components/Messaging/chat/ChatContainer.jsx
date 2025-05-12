// src/components/Messaging/chat/ChatContainer.jsx

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import NewChatModal from './NewChatModal';
import NotificationService from '../../../services/NotificationService';
import UnifiedMessaging from '../shared/UnifiedMessaging';
import MessageService from '../../../services/MessageService'; // Import MessageService directly

const ChatContainer = ({ chatNotifications }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatDetails, setChatDetails] = useState(null);
  
  // Handle navigation from notifications or buddy profiles
  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    }
  }, [location.state]);

  // Fetch chat details when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      // Mark notifications as read when chat is opened
      if (user?.uid) {
        NotificationService.markTabNotificationsAsRead(
          user.uid,
          'chat',
          selectedChat,
          'chat'
        );
      }

      // In a real implementation, you'd fetch chat details here
      // For now, we'll just use the chat ID
      setChatDetails({
        id: selectedChat,
        chatId: selectedChat
      });
    } else {
      setChatDetails(null);
    }
  }, [selectedChat, user]);

  const handleDeleteChat = async () => {
    try {
      if (!selectedChat || !user?.uid) {
        console.error('Cannot delete chat: Missing chat ID or user ID');
        return;
      }
      
      // Direct call to MessageService's deleteChat function
      await MessageService.deleteChat(selectedChat, user.uid);
      
      // Clear the selected chat and its details
      setSelectedChat(null);
      setChatDetails(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-lg shadow-md overflow-hidden">
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <ChatSidebar
          selectedChatId={selectedChat}
          onChatSelect={setSelectedChat}
          onNewChat={() => setShowNewChatModal(true)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            <ChatHeader 
              chatId={selectedChat}
              onDeleteChat={handleDeleteChat}
            />
            
            {chatDetails && (
              <div className="flex-1 relative">
                <UnifiedMessaging
                  context={chatDetails}
                  contextType="personal"
                  isOpen={true}
                  onClose={() => {}} // No need to close since it's embedded
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="mb-2">Select a chat or start a new conversation</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="text-blue-500 hover:underline"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={(chatId) => {
            setSelectedChat(chatId);
            setShowNewChatModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatContainer;