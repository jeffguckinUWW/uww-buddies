import React, { useState } from 'react';

export const MessageInput = ({ onSend, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

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
    <form onSubmit={handleSubmit} className="flex">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="flex-1 p-2 border rounded-l focus:outline-none focus:border-blue-500"
        placeholder="Type a message..."
        disabled={disabled || isSubmitting}
      />
      <button
        type="submit"
        className={`px-4 text-white rounded-r transition-colors duration-150 ${
          disabled || isSubmitting || !message.trim()
            ? 'bg-blue-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
        disabled={disabled || isSubmitting || !message.trim()}
      >
        {isSubmitting ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
};