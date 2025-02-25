// src/components/Messaging/shared/TypingIndicator.jsx

import React from 'react';

const TypingIndicator = ({ typingUsers, userProfiles = {}, currentUserId }) => {
  if (!typingUsers || typingUsers.length === 0) {
    return null;
  }
  
  // Filter out current user if they're typing
  const filteredUsers = typingUsers.filter(userId => userId !== currentUserId);
  
  if (filteredUsers.length === 0) {
    return null;
  }
  
  // Get names for display (up to 2 users)
  const userNames = filteredUsers
    .slice(0, 2)
    .map(userId => {
      const profile = userProfiles[userId] || {};
      return profile.displayName || 'Someone';
    });
  
  // Create display message
  let typingMessage = '';
  if (userNames.length === 1) {
    typingMessage = `${userNames[0]} is typing`;
  } else if (userNames.length === 2) {
    typingMessage = `${userNames[0]} and ${userNames[1]} are typing`;
  } else {
    const remaining = filteredUsers.length - 2;
    typingMessage = `${userNames.join(', ')} and ${remaining} more are typing`;
  }
  
  return (
    <div className="text-xs text-gray-500 italic flex items-center gap-2 p-2 border-t">
      <div className="flex gap-1">
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
        <span className="typing-dot"></span>
      </div>
      <span>{typingMessage}...</span>
      
      <style jsx>{`
        .typing-dot {
          width: 4px;
          height: 4px;
          background-color: #888;
          border-radius: 50%;
          display: inline-block;
          animation: typing-bounce 1.4s infinite both;
        }
        
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typing-bounce {
          0%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
};

export default TypingIndicator;