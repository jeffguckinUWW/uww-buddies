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

  // Add debugging useEffect
  useEffect(() => {
    console.log('MessageList - Messages received:', messages.map(m => ({
      id: m.id,
      timestamp: m.timestamp,
      uniqueKey: `${m.id}_${m.timestamp?.toMillis?.() || Date.now()}`
    })));
  }, [messages]);

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

  // Updated key generation function
  const getUniqueMessageKey = (message) => {
    if (!message.id) {
      console.warn('Message missing ID:', message);
      return Date.now() + Math.random();
    }
    return message.id;  // Just use the message ID if it exists
  };

  return (
    <div className={`flex flex-col space-y-4 p-4 overflow-y-auto ${className}`}>
      {messages.map((message) => (
        <MessageBubble
          key={getUniqueMessageKey(message)}
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