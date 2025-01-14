import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  loading = false,
  error = null,
  className = ""
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No messages yet</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-4 p-4 overflow-y-auto ${className}`}>
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isCurrentUser={message.senderId === currentUserId}
          onDelete={onDeleteMessage}
          isBroadcast={message.type === 'course_broadcast'}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;