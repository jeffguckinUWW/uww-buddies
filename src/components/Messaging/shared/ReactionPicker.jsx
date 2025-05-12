import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';

const ReactionPicker = ({ 
  messageId, 
  onReactionSelect, 
  isOwnMessage,
  isSmallScreen = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState('top'); // 'top' or 'bottom'
  const [isTouched, setIsTouched] = useState(false);
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
      const viewportWidth = window.innerWidth;
      
      // Need at least 200px for the emoji picker
      const spaceAbove = buttonRect.top;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      
      // Check if picker would go off-screen horizontally on mobile
      if (isSmallScreen && buttonRect.left < 120) {
        // If on the left edge, position to the right of the button
        setPosition('right-bottom');
      } else if (isSmallScreen && (viewportWidth - buttonRect.right) < 120) {
        // If on the right edge, position to the left of the button
        setPosition('left-bottom');
      } else {
        // Choose vertical position with more space
        setPosition(spaceBelow > spaceAbove ? 'bottom' : 'top');
      }
    }
  }, [isOpen, isSmallScreen]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emoji) => {
    onReactionSelect(emoji);
    setIsOpen(false);
    setIsTouched(false);
  };

  const togglePicker = () => {
    setIsOpen(prev => !prev);
  };

  // Touch event handlers
  const handleTouchStart = () => {
    setIsTouched(true);
  };

  const handleTouchEnd = () => {
    setIsTouched(false);
  };

  // Get picker position styles based on calculated position
  const getPickerPositionStyles = () => {
    switch (position) {
      case 'top':
        return 'bottom-full mb-2 left-0';
      case 'bottom':
        return 'top-full mt-2 left-0';
      case 'right-bottom':
        return 'top-full mt-2 left-0';
      case 'left-bottom':
        return 'top-full mt-2 right-0';
      default:
        return 'bottom-full mb-2 left-0';
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        ref={buttonRef}
        onClick={togglePicker}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`${
          isOwnMessage
            ? 'text-blue-200 hover:text-white'
            : 'text-gray-500 hover:text-gray-700'
        } ${
          isTouched ? 'opacity-80' : 'opacity-100'
        } ${
          isSmallScreen ? 'p-2 touch-target' : ''
        } transition-opacity no-tap-highlight`}
        aria-label="Add reaction"
      >
        <Smile size={isSmallScreen ? 18 : 14} />
      </button>
      
      {isOpen && (
        <div className={`absolute ${getPickerPositionStyles()} p-3 bg-white rounded-lg shadow-lg z-20 border ${
          isSmallScreen ? 'min-w-[250px]' : 'min-w-[220px]'
        }`}
          style={{
            maxHeight: isSmallScreen ? '250px' : '200px',
            overflowY: 'auto'
          }}
        >
          <div className={`grid ${isSmallScreen ? 'grid-cols-5 gap-3' : 'grid-cols-6 gap-2'}`}>
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                className={`${
                  isSmallScreen ? 'w-10 h-10' : 'w-8 h-8'
                } flex items-center justify-center hover:bg-gray-100 rounded text-lg transition-colors ${
                  isTouched && isSmallScreen ? 'bg-gray-100' : ''
                } touch-target no-tap-highlight`}
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