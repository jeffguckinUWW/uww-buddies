// src/components/Messaging/shared/MessageBubble.jsx - Updated with embedded context awareness

import React, { useState } from 'react';
import { Trash2, Megaphone, Mail, Users } from 'lucide-react';

const MessageBubble = ({
  message,
  isCurrentUser,
  onDelete,
  showSender = true,
  touchedMessageId = null,
  onTouchStart = null,
  onTouchEnd = null,
  isSmallScreen = false,
  isEmbedded = false // New prop to handle embedded vs modal contexts
}) => {
  // Add state to track hover state for delete button visibility
  const [isHovered, setIsHovered] = useState(false);
  
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    if (timestamp.toDate) {
      timestamp = timestamp.toDate();
    }
    if (!(timestamp instanceof Date)) {
      return '';
    }
    
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';
  };

  const getMessageStyle = () => {
    if (isCurrentUser) {
      return 'bg-blue-600 text-white rounded-2xl rounded-tr-lg';
    }

    switch (message.type) {
      case 'course_broadcast':
      case 'trip_broadcast':
        return 'bg-amber-50 text-gray-800 rounded-2xl rounded-tl-lg border-2 border-amber-200';
      case 'course_private':
      case 'trip_private':
        return 'bg-purple-50 text-gray-800 rounded-2xl rounded-tl-lg border-2 border-purple-200';
      case 'course_discussion':
      case 'trip_discussion':
        return 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-lg';
      default:
        return 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-lg';
    }
  };

  const getMessageBadge = () => {
    switch (message.type) {
      case 'course_broadcast':
      case 'trip_broadcast':
        return {
          text: 'Broadcast',
          icon: <Megaphone size={12} className="mr-1" />,
          className: 'bg-amber-100 text-amber-800'
        };
      case 'course_private':
      case 'trip_private':
        return {
          text: 'Private',
          icon: <Mail size={12} className="mr-1" />,
          className: 'bg-purple-100 text-purple-800'
        };
      case 'course_discussion':
      case 'trip_discussion':
        return {
          text: 'Discussion',
          icon: <Users size={12} className="mr-1" />,
          className: 'bg-gray-100 text-gray-600'
        };
      default:
        return null;
    }
  };

  const badge = getMessageBadge();

  // Touch event handlers for mobile feedback
  const handleTouchStart = () => {
    if (onTouchStart) {
      onTouchStart(message.id);
    }
  };

  const handleTouchEnd = () => {
    if (onTouchEnd) {
      onTouchEnd(null);
    }
  };

  const isTouched = touchedMessageId === message.id;

  // Handle showing delete button based on context - different approach for embedded view
  const showDeleteButton = isCurrentUser && onDelete && (
    isEmbedded ? 
      // For embedded view - always visible with hover enhancement
      (isHovered || isSmallScreen) :
      // For modal view - visible on hover, touch, or small screen
      (isHovered || isTouched || isSmallScreen)
  );

  return (
    <div 
      className={`flex items-start ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isCurrentUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
          <span className="text-sm font-medium text-gray-600">
            {getInitials(message.senderName)}
          </span>
        </div>
      )}
      
      <div className="group max-w-[75%] md:max-w-[70%] relative">
        {showSender && !isCurrentUser && (
          <div className="font-medium text-sm text-gray-600 mb-1 px-1 flex items-center">
            {message.senderName}
            {badge && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs flex items-center ${badge.className}`}>
                {badge.icon}
                {badge.text}
              </span>
            )}
          </div>
        )}
        
        <div 
          className={`relative p-3 ${getMessageStyle()} ${
            isTouched ? 'opacity-80' : 'opacity-100'
          } transition-opacity`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <div className={`mt-1 text-xs ${
            isCurrentUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>

          {/* More aggressive styling for the delete button - use inline style for position */}
          {showDeleteButton && (
            <button
              onClick={() => {
                // Add confirmation before deleting
                if (window.confirm('Are you sure you want to delete this message?')) {
                  onDelete(message.id);
                }
              }}
              // Use a more visually distinct styling
              className="absolute bg-white text-red-500 p-2 rounded-full shadow-md border border-gray-200 z-10"
              style={{ 
                left: isEmbedded ? '-2.5rem' : '-3rem',
                top: '0.5rem'
              }}
              aria-label="Delete message"
            >
              <Trash2 className="text-red-500" size={isSmallScreen ? 18 : 16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;