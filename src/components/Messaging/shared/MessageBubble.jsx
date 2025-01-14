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
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%] group">
        {showSender && !isCurrentUser && (
          <div className="ml-2 mb-1">
            <span className="text-sm font-medium text-gray-700">
              {message.senderName}
            </span>
            {isBroadcast && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                Broadcast
              </span>
            )}
          </div>
        )}
        
        <div className={`
          relative p-3 rounded-lg
          ${isCurrentUser 
            ? 'bg-blue-500 text-white rounded-br-none' 
            : isBroadcast
              ? 'bg-green-50 text-gray-800 rounded-bl-none'
              : 'bg-gray-100 text-gray-800 rounded-bl-none'
          }
        `}>
          <p className="whitespace-pre-wrap break-words">{message.text}</p>
          <div className="flex items-center justify-end mt-1 space-x-2">
            <span className="text-xs opacity-75">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>

          {isCurrentUser && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="absolute -right-6 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Delete message"
            >
              <Trash2 
                size={16} 
                className="text-red-500 hover:text-red-600"
              />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;