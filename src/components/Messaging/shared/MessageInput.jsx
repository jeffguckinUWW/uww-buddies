import React, { useState } from 'react';
import { Send } from 'lucide-react';

const MessageInput = ({ 
  onSend, 
  disabled = false, 
  placeholder = "Type a message...",
  className = ""
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting || disabled) return;

    try {
      setIsSubmitting(true);
      await onSend(message.trim());
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white border-t">
      <div className="flex gap-2 items-center bg-gray-50 rounded-full px-4 py-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || isSubmitting}
          className="flex-1 bg-transparent border-0 focus:outline-none text-gray-600 placeholder-gray-500"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || isSubmitting || !message.trim()}
          className="text-blue-500 hover:text-blue-600 disabled:text-gray-400 p-1"
        >
          <Send className="w-5 h-5 rotate-45" />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;