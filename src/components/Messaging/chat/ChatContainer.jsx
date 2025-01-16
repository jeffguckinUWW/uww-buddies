import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageList from '../shared/MessageList';
import MessageInput from '../shared/MessageInput';
import { MessageTypes } from '../../../services/MessageService';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import NewChatModal from './NewChatModal';

const ChatContainer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const { 
    messages, 
    loading, 
    error,
    subscribeToMessages, 
    sendMessage,
    deleteMessage,
    deleteChat  // Fixed capitalization
  } = useMessages();

  // Handle navigation from notifications or buddy profiles
  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    }
  }, [location.state]);

  // Subscribe to messages for selected chat
  useEffect(() => {
    if (!selectedChat || !user?.uid) return;

    const unsubscribe = subscribeToMessages({
      type: 'chat',
      chatId: selectedChat
    });

    return () => unsubscribe();
  }, [selectedChat, user, subscribeToMessages]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || !user || !selectedChat) return;

    try {
      console.log('ChatContainer - Preparing message data');
      const messageData = {
        chatId: selectedChat,
        senderId: user.uid,
        senderName: user.displayName || 'Unknown User',
        text: text.trim(),
        type: MessageTypes.DIRECT,
        readBy: [user.uid]
      };

      console.log('ChatContainer - Message data prepared:', messageData);
      await sendMessage(messageData);
      console.log('ChatContainer - Message sent successfully');
    } catch (err) {
      console.error('ChatContainer - Error in handleSendMessage:', err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId, user.uid);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleDeleteChat = async () => {
    try {
      await deleteChat(selectedChat, user.uid);
      setSelectedChat(null);  // Clear selection after successful deletion
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-lg shadow-md overflow-hidden">
      {/* Left Sidebar - Chat List */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <ChatSidebar
          selectedChatId={selectedChat}
          onChatSelect={setSelectedChat}
          onNewChat={() => setShowNewChatModal(true)}
        />
      </div>

      {/* Right Side - Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            <ChatHeader 
              chatId={selectedChat}
              onDeleteChat={handleDeleteChat}  // Now using the proper handler
            />
            
            <MessageList
              messages={messages}
              currentUserId={user?.uid}
              onDeleteMessage={handleDeleteMessage}
              loading={loading}
              error={error}
              className="flex-1"
            />

            <div className="p-4 border-t">
              <MessageInput 
                onSend={handleSendMessage}
                disabled={loading}
                placeholder="Type a message..."
              />
            </div>
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

      {/* New Chat Modal */}
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