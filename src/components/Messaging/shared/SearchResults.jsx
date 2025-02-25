// src/components/Messaging/shared/SearchResults.jsx

import React from 'react';
import { useMessages } from '../../../context/MessageContext';
import MessageList from './MessageList';
import { Alert, AlertDescription } from '../../../components/ui/alert';

const SearchResults = ({ 
  currentUserId,
  onDeleteMessage,
  onEditMessage,
  onReplyMessage,
  onViewThread,
  isInstructor
}) => {
  const { 
    searchResults, 
    searchLoading, 
    searchError, 
    isSearching,
    clearSearch 
  } = useMessages();

  if (searchLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (searchError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>{searchError}</AlertDescription>
      </Alert>
    );
  }

  if (!isSearching) {
    return null;
  }

  if (searchResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <p>No messages found</p>
        <button
          onClick={clearSearch}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white p-4 border-b">
        <div className="text-sm text-gray-600">
          Found {searchResults.length} messages
        </div>
        <button
          onClick={clearSearch}
          className="text-sm text-blue-500 hover:underline"
        >
          Clear search
        </button>
      </div>
      <MessageList
        messages={searchResults}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        onEditMessage={onEditMessage}
        onReplyMessage={onReplyMessage}
        onViewThread={onViewThread}
        showThreadIndicator={true}
        isInstructor={isInstructor}
      />
    </div>
  );
};

export default SearchResults;