import React, { useState, useRef, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Megaphone, Edit2, X } from 'lucide-react';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import BroadcastReadReceipts from './BroadcastReadReceipts';
import FilePreview from './FilePreview';
import ReactionPicker from './ReactionPicker';
import { useMessages } from '../../../context/MessageContext';

const MessageList = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onEditMessage,
  loading,
  loadingMore,
  error,
  showBroadcastIndicator = false,
  isInstructor = false,
  hasMore = false,
  onLoadMore,
  className = ""
}) => {
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const { addReaction, getSortedReactions } = useMessages();
  
  const observerRef = useRef(null);
  const loadingRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loadingMore, onLoadMore]);

  React.useEffect(() => {
    const options = {
      root: null,
      rootMargin: '20px',
      threshold: 0
    };

    observerRef.current = new IntersectionObserver(handleObserver, options);

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver]);

  const handleStartEdit = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (messageId) => {
    try {
      if (onEditMessage) {
        await onEditMessage(messageId, editText);
      } else {
        console.warn("Edit message function not provided");
      }
      setEditingMessageId(null);
      setEditText('');
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleReaction = (messageId, emoji) => {
    if (!messageId || !emoji) return;
    
    // Use a try-catch to prevent UI crashes
    try {
      addReaction(messageId, emoji).catch(error => {
        // Silently log errors without breaking the UI
        console.error('Reaction error:', error);
      });
    } catch (error) {
      console.error('Error in reaction handler:', error);
    }
  };

  const isMessageEditable = (message) => {
    if (!message || !currentUserId) return false;

    // Can only edit your own messages
    if (message.senderId !== currentUserId) return false;

    // Can't edit broadcast messages
    if (message.type?.includes('broadcast')) return false;

    // Can't edit deleted messages
    if (message.deletedFor?.includes(currentUserId)) return false;

    // Optional: Add time limit for editing (e.g., 24 hours)
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const messageTime = message.timestamp?.toDate?.() || message.timestamp;
    if (Date.now() - messageTime > editTimeLimit) return false;

    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  // Properly handle error objects
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertDescription>
          {typeof error === 'object' && error !== null 
            ? error.message || 'An unknown error occurred' 
            : error}
        </AlertDescription>
      </Alert>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // IMPROVED: More robust broadcast checking
  const isBroadcast = (message) => {
    return message.isBroadcast === true || 
           message.type?.includes('broadcast') || 
           message.type === 'trip_broadcast' || 
           message.type === 'course_broadcast';
  };

  // Safely get reactions for display
  const getMessageReactions = (message) => {
    if (!message || !message.reactions) return [];
    try {
      return getSortedReactions(message.reactions);
    } catch (error) {
      console.error('Error processing reactions:', error);
      return [];
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto ${className}`} style={{ maxHeight: 'calc(100vh - 180px)' }}>
      <div className="flex flex-col space-y-4 p-4">
        {/* Loading More Indicator */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Intersection Observer Target */}
        {hasMore && <div ref={loadingRef} className="h-1" />}

        {/* Show a message when there are no messages to display */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">No messages yet</div>
          </div>
        )}

        {/* Grouped messages */}
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date} className="space-y-4">
            <div className="sticky top-0 z-10 flex justify-center">
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {format(new Date(date), 'MMMM d, yyyy')}
              </span>
            </div>

            {dateMessages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;
              const broadcastMessage = isBroadcast(message);
              const isEditing = editingMessageId === message.id;
              const reactions = getMessageReactions(message);

              // Debug info
              if (broadcastMessage) {
                console.log('Rendering broadcast message:', {
                  id: message.id,
                  type: message.type,
                  isBroadcast: message.isBroadcast
                });
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative group max-w-[80%] ${
                      broadcastMessage
                        ? 'w-full bg-blue-50 border border-blue-100 rounded-lg p-3'
                        : isOwnMessage
                        ? 'bg-[#4460F1] text-white rounded-2xl rounded-tr-sm p-3'
                        : 'bg-gray-100 rounded-2xl rounded-tl-sm p-3'
                    }`}
                  >
                    {/* Broadcast Icon */}
                    {(broadcastMessage && showBroadcastIndicator) && (
                      <div className="absolute -left-2 -top-2 bg-blue-500 text-white p-1 rounded-full">
                        <Megaphone size={12} />
                      </div>
                    )}

                    {/* Sender Name */}
                    {(!isOwnMessage || broadcastMessage) && (
                      <div className={`text-sm font-medium mb-1 ${
                        broadcastMessage ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {message.senderName}
                        {broadcastMessage && (
                          <span className="ml-2 text-xs font-normal text-blue-600">
                            Broadcast
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message Text or Edit Input */}
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full p-2 rounded border text-gray-800 min-h-[60px] resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(message.id)}
                            className="p-1 hover:bg-gray-100 rounded text-green-600"
                            disabled={!editText.trim()}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={`text-sm ${
                          broadcastMessage
                            ? 'text-gray-800'
                            : isOwnMessage
                            ? 'text-white'
                            : 'text-gray-800'
                        }`}>
                          {message.text}
                        </div>
                        
                        {/* File Attachment Preview */}
                        {message.fileAttachment && (
                          <div className="mt-2 max-w-full overflow-hidden">
                            <FilePreview fileAttachment={message.fileAttachment} />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Display emoji reactions */}
                    {reactions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {reactions.map(reaction => (
                          <button
                            key={reaction.emoji}
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                            className={`px-1.5 py-0.5 rounded-full text-xs ${
                              reaction.users.some(u => u.id === currentUserId)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            <span>{reaction.emoji} {reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Footer: Timestamp, Read Status, Actions */}
                    <div className={`flex items-center justify-end gap-2 mt-1 ${
                      broadcastMessage
                        ? 'text-blue-600'
                        : isOwnMessage
                        ? 'text-blue-200'
                        : 'text-gray-500'
                    }`}>
                      {/* Broadcast Read Status */}
                      {broadcastMessage && (
                        <BroadcastReadReceipts 
                          message={message}
                          isInstructor={isInstructor}
                        />
                      )}

                      {/* Edit/Delete Controls */}
                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {/* Reaction Picker */}
                            <ReactionPicker
                              messageId={message.id}
                              onReactionSelect={(emoji) => {
                                if (emoji) handleReaction(message.id, emoji);
                              }}
                              isOwnMessage={isOwnMessage}
                            />

                          {/* Edit Button */}
                          {isMessageEditable(message) && (
                            <button
                              onClick={() => handleStartEdit(message)}
                              className={`${
                                broadcastMessage
                                  ? 'text-blue-600 hover:text-blue-800'
                                  : 'text-blue-200 hover:text-white'
                              }`}
                              aria-label="Edit message"
                            >
                              <Edit2 size={14} />
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => onDeleteMessage && onDeleteMessage(message.id)}
                            className={`${
                              broadcastMessage
                                ? 'text-blue-600 hover:text-blue-800'
                                : 'text-blue-200 hover:text-white'
                            }`}
                            aria-label="Delete message"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                      {/* Edited Indicator */}
                      {message.isEdited && !isEditing && (
                        <span className="text-xs italic">
                          (edited)
                        </span>
                      )}

                      {/* Timestamp */}
                      <span className="text-xs">
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        
        {/* Scroll anchor for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;