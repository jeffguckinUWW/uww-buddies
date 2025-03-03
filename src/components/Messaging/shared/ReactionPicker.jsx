import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';

const ReactionPicker = ({ messageId, onReactionSelect, isOwnMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState('top'); // 'top' or 'bottom'
  const buttonRef = useRef(null);
  const pickerRef = useRef(null);
  const { getCommonEmojis } = useMessages();
  
  const commonEmojis = getCommonEmojis();

  // Determine position on open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Calculate button position relative to viewport
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Need at least 200px for the emoji picker
      const spaceAbove = buttonRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      
      // Choose position with more space
      setPosition(spaceBelow > spaceAbove ? 'bottom' : 'top');
    }
  }, [isOpen]);

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
        ref={buttonRef}
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
        <div className={`absolute ${
          position === 'top' 
            ? 'bottom-full mb-2' 
            : 'top-full mt-2'
          } left-0 p-3 bg-white rounded-lg shadow-lg z-20 border min-w-[220px]`}
          style={{
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          <div className="grid grid-cols-6 gap-2">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors"
                title={`React with ${emoji}`}
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