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
    <form 
      onSubmit={handleSubmit} 
      className={`flex items-center gap-2 p-2 ${className}`}
    >
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || isSubmitting}
        className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      />
      <button
        type="submit"
        disabled={disabled || isSubmitting || !message.trim()}
        className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send size={20} />
        )}
      </button>
    </form>
  );
};

export default MessageInput;