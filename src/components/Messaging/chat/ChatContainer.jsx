// src/components/Messaging/chat/ChatContainer.jsx - Updated

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import NewChatModal from './NewChatModal';
import NotificationService from '../../../services/NotificationService';
import UnifiedMessaging from '../shared/UnifiedMessaging';
import MessageService from '../../../services/MessageService';

const ChatContainer = ({ chatNotifications, isSmallScreen }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatDetails, setChatDetails] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // Handle navigation from notifications or buddy profiles
  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
      if (isSmallScreen) {
        setShowSidebar(false);
      }
    }
  }, [location.state, isSmallScreen]);

  // Toggle sidebar visibility based on screen size
  useEffect(() => {
    if (isSmallScreen && selectedChat) {
      setShowSidebar(false);
    } else if (!isSmallScreen) {
      setShowSidebar(true);
    }
  }, [isSmallScreen, selectedChat]);

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
      
      await MessageService.deleteChat(selectedChat, user.uid);
      
      setSelectedChat(null);
      setChatDetails(null);
      
      // Show sidebar when a chat is deleted (especially important on mobile)
      setShowSidebar(true);
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  const handleBackToList = () => {
    setShowSidebar(true);
  };

  // Calculate dynamic classes based on sidebar visibility and screen size
  const sidebarClasses = `
    ${isSmallScreen ? 'w-full' : 'w-1/3 md:w-2/5 lg:w-1/3'} 
    border-r flex flex-col bg-gray-50
    ${isSmallScreen && !showSidebar ? 'hidden' : 'block'}
  `;
  
  const chatAreaClasses = `
    flex-1 flex flex-col overflow-hidden
    ${isSmallScreen && showSidebar ? 'hidden' : 'flex'}
  `;

  return (
    <div className="h-full w-full flex bg-white rounded-lg shadow-md overflow-hidden">
      {/* Chat List Sidebar */}
      <div className={sidebarClasses}>
        <ChatSidebar
          selectedChatId={selectedChat}
          onChatSelect={(chatId) => {
            setSelectedChat(chatId);
            if (isSmallScreen) {
              setShowSidebar(false);
            }
          }}
          onNewChat={() => setShowNewChatModal(true)}
          isSmallScreen={isSmallScreen}
        />
      </div>

      {/* Chat Area */}
      <div className={chatAreaClasses}>
        {selectedChat ? (
          <>
            <ChatHeader 
              chatId={selectedChat}
              onDeleteChat={handleDeleteChat}
              showBackButton={isSmallScreen}
              onBack={handleBackToList}
            />
            
            {chatDetails && (
              <div className="flex-1 flex flex-col">
                <UnifiedMessaging
                  context={chatDetails}
                  contextType="personal"
                  isOpen={true}
                  onClose={() => {}}
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
            if (isSmallScreen) {
              setShowSidebar(false);
            }
          }}
        />
      )}
    </div>
  );
};

export default ChatContainer;