import React from 'react';
import { Trash2 } from 'lucide-react';

const MessageBubble = ({
  message,
  isCurrentUser,
  onDelete,
  showSender = true,
  isBroadcast = false
}) => {
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

  return (
    <div className={`flex items-start ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
          <span className="text-sm font-medium text-gray-600">
            {getInitials(message.senderName)}
          </span>
        </div>
      )}
      
      <div className="group max-w-[70%]">
        {showSender && !isCurrentUser && (
          <div className="font-medium text-sm text-gray-600 mb-1 px-1">
            {message.senderName}
            {isBroadcast && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                Broadcast
              </span>
            )}
          </div>
        )}
        
        <div className={`
          relative p-3
          ${isCurrentUser 
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-lg' 
            : isBroadcast
              ? 'bg-green-50 text-gray-800 rounded-2xl rounded-tl-lg'
              : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-lg'
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <div className={`mt-1 text-xs ${
            isCurrentUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>

          {isCurrentUser && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -left-8 top-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete message"
            >
              <Trash2 size={16} className="text-red-500 hover:text-red-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;