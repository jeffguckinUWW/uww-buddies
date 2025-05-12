import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X } from 'lucide-react';
import FileUpload from './FileUpload';

const MessageInput = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  className = "",
  isSending = false,
  sendError = null,
  typingParams = null,
  onTypingStatus = null,
  hasLargerSendButton = false // New prop for mobile optimization
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  // Handle typing status
  const handleTypingStatus = useCallback((isTyping) => {
    if (onTypingStatus && typingParams) {
      onTypingStatus(typingParams, isTyping);
    }
  }, [onTypingStatus, typingParams]);

  // Clear typing timeout
  const clearTypingTimeout = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Message change handler with typing status
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Only emit typing events if we have typing params and handler
    if (onTypingStatus && typingParams) {
      const now = Date.now();
      
      // Only send typing status after 500ms has passed since last update
      if (now - lastTypingRef.current > 500) {
        handleTypingStatus(true);
        lastTypingRef.current = now;
      }
      
      // Clear any existing timeout
      clearTypingTimeout();
      
      // Set typing status to false after 5 seconds of no typing
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStatus(false);
      }, 5000);
    }
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      clearTypingTimeout();
      // Send typing false status when unmounting
      handleTypingStatus(false);
    };
  }, [handleTypingStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || isSubmitting || disabled || isSending) return;

    try {
      setIsSubmitting(true);
      
      // Clear typing status on send
      handleTypingStatus(false);
      clearTypingTimeout();
      
      await onSend(message.trim(), selectedFile);
      setMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`p-3 md:p-4 bg-white border-t ${className}`}>
      {/* Error message */}
      {sendError && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <p>Failed to send message: {sendError.message || 'Unknown error'}</p>
          <button 
            className="text-xs text-red-600 underline mt-1 hover:text-red-800"
            onClick={() => onSend(message.trim(), selectedFile)}
          >
            Retry
          </button>
        </div>
      )}

      {selectedFile && (
        <div className="mb-2 px-4 py-1 bg-gray-50 rounded-full flex items-center justify-between">
          <span className="text-sm text-gray-600 truncate">
            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
          </span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-gray-400 hover:text-gray-600 p-1 touch-target"
            aria-label="Remove file"
          >
            <X size={16} />
          </button>
        </div>
      )}
      
      <div className="flex gap-2 items-center bg-gray-50 rounded-full px-3 md:px-4 py-2">
        <FileUpload
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onClearFile={() => setSelectedFile(null)}
          isSmallScreen={hasLargerSendButton}
        >
          <button
            type="button"
            className={`text-gray-400 hover:text-gray-600 ${hasLargerSendButton ? 'p-2' : 'p-1'} touch-target no-tap-highlight`}
            disabled={disabled || isSubmitting || isSending}
            aria-label="Attach file"
          >
            <Paperclip size={hasLargerSendButton ? 24 : 20} />
          </button>
        </FileUpload>

        <input
          type="text"
          value={message}
          onChange={handleMessageChange}
          placeholder={isSending ? "Sending..." : placeholder}
          disabled={disabled || isSubmitting || isSending}
          className="flex-1 bg-transparent border-0 focus:outline-none text-gray-600 placeholder-gray-500 touch-input"
        />
        
        <button
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || isSending || (!message.trim() && !selectedFile)}
          className={`
            text-blue-500 hover:text-blue-600 disabled:text-gray-400 
            ${hasLargerSendButton ? 'p-2' : 'p-1'}
            ${isSending ? 'animate-pulse' : ''}
            touch-target no-tap-highlight
          `}
          aria-label="Send message"
        >
          {isSending ? (
            <div className={`rounded-full border-2 border-blue-500 border-t-transparent animate-spin ${hasLargerSendButton ? 'h-6 w-6' : 'h-5 w-5'}`} />
          ) : (
            <Send className={hasLargerSendButton ? 'w-6 h-6 rotate-45' : 'w-5 h-5 rotate-45'} />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;