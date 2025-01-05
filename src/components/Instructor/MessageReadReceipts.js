import React, { useState } from 'react';

const MessageReadReceipts = ({ message, course }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!message || message.type !== 'broadcast' || !message.readBy) {
    return null;
  }

  const totalReaders = message.readBy.length;
  const totalRecipients = message.totalRecipients;
  const percentage = Math.round((totalReaders / totalRecipients) * 100);

  // Get readers' names
  const readers = message.readBy.map(readerId => {
    const student = course.students?.find(s => s.uid === readerId);
    const assistant = course.assistants?.find(a => a.uid === readerId);
    return (student || assistant)?.displayName || 'Unknown User';
  });

  return (
    <div className="mt-1">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <div className="w-16 h-1 bg-gray-200 rounded-full">
          <div 
            className="h-1 bg-green-500 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span>Read by {totalReaders}/{totalRecipients}</span>
      </button>

      {showDetails && (
        <div className="mt-1 text-xs text-gray-500">
          {readers.length > 0 ? (
            readers.map(name => (
              <div key={name} className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {name}
              </div>
            ))
          ) : (
            <div>No readers yet</div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageReadReceipts;