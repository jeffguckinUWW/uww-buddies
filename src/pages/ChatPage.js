import React from 'react';
import { MessageProvider } from '../context/MessageContext';
import ChatContainer from '../components/Messaging/chat/ChatContainer';

const ChatPage = () => {
  return (
    <MessageProvider>
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <ChatContainer />
        </div>
      </div>
    </MessageProvider>
  );
};

export default ChatPage;