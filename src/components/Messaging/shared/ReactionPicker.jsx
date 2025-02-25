import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';

const ReactionPicker = ({ messageId, onReactionSelect, isOwnMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef(null);
  const { getCommonEmojis } = useMessages();
  
  const commonEmojis = getCommonEmojis();

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji) => {
    onReactionSelect(emoji);
    setIsOpen(false);
  };

  const togglePicker = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={togglePicker}
        className={`${
          isOwnMessage
            ? 'text-blue-200 hover:text-white'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        aria-label="Add reaction"
      >
        <Smile size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 p-2 bg-white rounded-lg shadow-lg z-10 border">
          <div className="grid grid-cols-5 gap-1">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;