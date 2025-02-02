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
      <div className="flex items-center justify-center h-full text-red-500 p-4">
        <div className="bg-red-50 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <div className="mb-2">👋</div>
          <p>No messages yet</p>
        </div>
      </div>
    );
  }

  const groupedMessages = messages.reduce((groups, message) => {
    const date = message.timestamp?.toDate?.() || new Date(message.timestamp);
    const dateStr = date.toLocaleDateString();
    
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="mb-6">
              <div className="text-center mb-4">
                <span className="text-sm text-gray-500">
                  {new Date(date).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <div className="space-y-3">
                {dateMessages.map((message) => (
                  <MessageBubble
                    key={message.id || Date.now() + Math.random()}
                    message={message}
                    isCurrentUser={message.senderId === currentUserId}
                    onDelete={onDeleteMessage}
                    isBroadcast={message.type === 'course_broadcast'}
                  />
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>
    </div>
  );
};

export default MessageList;