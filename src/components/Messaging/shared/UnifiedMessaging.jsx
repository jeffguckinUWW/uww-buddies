// src/components/Messaging/shared/UnifiedMessaging.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MessageSquare, User, Megaphone } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import { Card } from '../../../components/ui/card';
import EnhancedErrorAlert from '../../../components/ui/EnhancedErrorAlert';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import TypingIndicator from './TypingIndicator';
import { db } from '../../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import NotificationService from '../../../services/NotificationService';

/**
 * A unified messaging component that works for all messaging contexts:
 * - Personal messages (buddy-to-buddy)
 * - Course messages (instructor-student)
 * - Trip messages (leader-participant)
 * 
 * @param {Object} props
 * @param {Object} props.context - The course, trip, or chat object
 * @param {string} props.contextType - "personal", "course", or "trip"
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to close the modal
 * @param {string} props.defaultTab - Which tab to show initially ("broadcast", "discussion", "private")
 * @param {Object} props.recipient - Optional specific recipient for direct messages
 */
const UnifiedMessaging = ({
  context,
  contextType,
  isOpen,
  onClose,
  defaultTab = 'discussion',
  recipient = null
}) => {
  const { user } = useAuth();
  const {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    isSearching,
    subscribeToMessages,
    subscribeToTypingStatus,
    setTypingStatus,
    typingUsers,
    loadMoreMessages,
    sendMessage,
    sendMessageWithFile,
    deleteMessage,
    deleteMessageWithFile,
    deleteChat, // Add this function
    editMessage,
    addReaction
  } = useMessages();

  // Detect if we're in embedded mode (like in ChatContainer)
  const isEmbedded = contextType === 'personal' || 
    (isOpen === true && typeof onClose === 'function' && 
    onClose.toString().includes('() => {}'));

  // Component state
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedRecipient, setSelectedRecipient] = useState(recipient);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const [isStable, setIsStable] = useState(false);
  // Added state for mobile interaction
  const [touchedMessageId, setTouchedMessageId] = useState(null);
  // Added state for screen size detection
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Derived properties
  const isLeader = contextType === 'course' 
    ? context?.instructorId === user?.uid 
    : context?.instructorId === user?.uid;
  
  // Get the appropriate ID field for the context
  const contextId = context?.id || (contextType === 'personal' ? context?.chatId : null);
  
  // Get recipients for the context (students, participants, etc.)
  const contextMembers = contextType === 'course' 
    ? context?.students || []
    : contextType === 'trip' 
      ? context?.participants || []
      : [];

  // Refs for tracking component state
  const subscriptionsRef = useRef([]);
  const isComponentMounted = useRef(true);
  const notificationsClearedRef = useRef(false);
  const stabilityTimerRef = useRef(null);
  // Added ref for dialog
  const dialogRef = useRef(null);
  
  // Filtered members for the recipient list
  const filteredMembers = contextMembers.filter(member =>
    member.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Setup component lifecycle
  useEffect(() => {
    isComponentMounted.current = true;
    
    // Clear any existing stability timer
    if (stabilityTimerRef.current) {
      clearTimeout(stabilityTimerRef.current);
    }

    // Add a stability timer to ensure component is fully initialized
    stabilityTimerRef.current = setTimeout(() => {
      if (isComponentMounted.current) {
        setIsStable(true);
      }
    }, 500);
    
    return () => {
      isComponentMounted.current = false;
      
      if (stabilityTimerRef.current) {
        clearTimeout(stabilityTimerRef.current);
      }
      
      // Clean up all subscriptions on unmount
      subscriptionsRef.current.forEach(unsub => {
        if (typeof unsub === 'function') {
          try {
            unsub();
          } catch (e) {
            console.error('Error during unsubscribe:', e);
          }
        }
      });
      subscriptionsRef.current = [];
    };
  }, []);

  // Added effect to detect screen size
  useEffect(() => {
    // Check if we're on a small screen
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    // Check on mount
    checkScreenSize();
    
    // Add resize listener
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Fetch user profiles for typing indicators
  useEffect(() => {
    if (!typingUsers || typingUsers.length === 0 || !isStable) return;
    
    const fetchUserProfiles = async () => {
      const newProfiles = {...userProfiles};
      let hasNewProfiles = false;
      
      for (const userId of typingUsers) {
        if (!userProfiles[userId]) {
          try {
            const profileRef = doc(db, 'profiles', userId);
            const profileSnap = await getDoc(profileRef);
            const userData = profileSnap.exists() ? {
              ...profileSnap.data(),
              uid: userId
            } : null;
            if (userData && isComponentMounted.current) {
              newProfiles[userId] = userData;
              hasNewProfiles = true;
            }
          } catch (error) {
            console.error(`Error fetching user profile for ${userId}:`, error);
          }
        }
      }
      
      if (hasNewProfiles && isComponentMounted.current) {
        setUserProfiles(newProfiles);
      }
    };
    
    fetchUserProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingUsers, isStable]);
  
  // Subscribe to typing status
  useEffect(() => {
    if (!contextId || !user?.uid || !isStable) return;
    
    const typingParams = {
      type: contextType,
      [contextType === 'course' ? 'courseId' : contextType === 'trip' ? 'tripId' : 'chatId']: contextId,
      messageType: activeTab === 'broadcast' 
        ? `${contextType}_broadcast` 
        : activeTab === 'discussion'
          ? `${contextType}_discussion`
          : `${contextType}_private`,
      ...(activeTab === 'private' && selectedRecipient ? { recipientId: selectedRecipient.uid } : {})
    };
    
    let unsubscribe;
    // Add small delay to ensure clean subscription setup
    const timeoutId = setTimeout(() => {
      if (isComponentMounted.current) {
        unsubscribe = subscribeToTypingStatus(typingParams);
        if (unsubscribe) {
          subscriptionsRef.current.push(unsubscribe);
        }
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (unsubscribe) {
        try {
          unsubscribe();
          subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub !== unsubscribe);
        } catch (e) {
          console.error('Error unsubscribing from typing:', e);
        }
      }
      
      // Make sure to set typing status to false when unmounting
      if (isComponentMounted.current) {
        setTypingStatus(typingParams, false);
      }
    };
  }, [contextId, user?.uid, activeTab, contextType, subscribeToTypingStatus, setTypingStatus, isStable, selectedRecipient]);  

  // Subscribe to messages based on active tab
  useEffect(() => {
    if (!contextId || !user?.uid || !isStable || !contextType) return;

    // Unsubscribe from existing message subscriptions first
    const messageSubscriptions = subscriptionsRef.current.filter(
      sub => sub.subscriptionType === 'messages'
    );
    
    messageSubscriptions.forEach(sub => {
      try {
        sub();
        subscriptionsRef.current = subscriptionsRef.current.filter(s => s !== sub);
      } catch (e) {
        console.error('Error unsubscribing from messages:', e);
      }
    });

    // Setup new subscription with delay
    const timeoutId = setTimeout(() => {
      if (!isComponentMounted.current) return;
      
      let unsub;
      const idField = contextType === 'course' ? 'courseId' 
                    : contextType === 'trip' ? 'tripId' 
                    : 'chatId';
      
      const subscriptionParams = {
        type: contextType,
        [idField]: contextId,
        messageType: activeTab === 'broadcast' 
          ? `${contextType}_broadcast` 
          : activeTab === 'discussion'
            ? `${contextType}_discussion`
            : `${contextType}_private`
      };
      
      // For private messages in direct chat, handle differently
      if (activeTab === 'private' && contextType !== 'personal') {
        if (isLeader && selectedRecipient) {
          subscriptionParams.recipientId = selectedRecipient.uid;
        } else if (!isLeader) {
          // For students/participants messaging the instructor/leader
          subscriptionParams.recipientId = context.instructorId;
        }
      }
      
      unsub = subscribeToMessages(subscriptionParams);
      
      if (unsub) {
        unsub.subscriptionType = 'messages';
        subscriptionsRef.current.push(unsub);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [contextId, user?.uid, subscribeToMessages, contextType, activeTab, isLeader, isStable, selectedRecipient, context?.instructorId]);

  // Memoize handlers to prevent recreating on every render
  const handleReaction = useCallback(async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [addReaction]);

  const handleLoadMore = useCallback(() => {
    if (!contextId) return;
    
    const idField = contextType === 'course' ? 'courseId' 
                  : contextType === 'trip' ? 'tripId' 
                  : 'chatId';
    
    const params = {
      type: contextType,
      [idField]: contextId,
      messageType: activeTab === 'broadcast' 
        ? `${contextType}_broadcast` 
        : activeTab === 'discussion'
          ? `${contextType}_discussion`
          : `${contextType}_private`
    };
    
    loadMoreMessages(params);
  }, [loadMoreMessages, contextId, contextType, activeTab]);

  const handleSendMessage = async (text, file, type = activeTab, recipientId = null) => {
    if ((!text.trim() && !file) || !user || !context) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      const idField = contextType === 'course' ? 'courseId' 
                    : contextType === 'trip' ? 'tripId' 
                    : 'chatId';
      
      let messageType;
      switch (type) {
        case 'broadcast':
          messageType = `${contextType}_broadcast`;
          break;
        case 'private':
          messageType = `${contextType}_private`;
          break;
        default:
          messageType = contextType === 'personal' 
            ? 'chat' 
            : `${contextType}_discussion`;
      }
  
      // Format sender name appropriately
      let senderDisplayName = user.name || user.displayName || user.email || 'Unknown User';
      if (type === 'broadcast' && isLeader) {
        senderDisplayName += contextType === 'course' ? ' (Instructor)' : ' (Trip Leader)';
      }
  
      // Prepare message data
      const messageData = {
        [idField]: contextId,
        senderId: user.uid,
        senderName: senderDisplayName,
        text: text.trim(),
        timestamp: new Date(),
        type: messageType,
      };
  
      // Add recipient for private messages
      if (type === 'private') {
        if (isLeader && selectedRecipient) {
          messageData.recipientId = selectedRecipient.uid;
        } else if (!isLeader) {
          messageData.recipientId = context.instructorId;
        }
      }
  
      // Add read tracking for broadcasts
      if (type === 'broadcast') {
        const members = contextType === 'course' 
          ? [...(context.students || []), ...(context.assistants || [])]
          : context.participants || [];
  
        messageData.readBy = [user.uid];
        messageData.readStatus = members.reduce((acc, member) => {
          acc[member.uid] = {
            read: false,
            readAt: null,
            name: member.displayName || 'Unknown User'
          };
          return acc;
        }, {});
        messageData.totalRecipients = members.length;
        messageData.readCount = 0;
      }
      
      // Send the message
      if (file) {
        await sendMessageWithFile(messageData, file);
      } else {
        await sendMessage(messageData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = useCallback(async (messageId) => {
    if (!user?.uid) return;
    
    try {
      // Add confirmation before deleting
      if (window.confirm('Are you sure you want to delete this message?')) {
        const message = messages.find(msg => msg.id === messageId);
        
        // Check if we're in a personal chat context
        if (contextType === 'personal') {
          // For personal chats, we need to delete the chat instead of just the message
          if (typeof deleteChat !== 'function') {
            console.error('deleteChat is not a function in this component', { deleteChat, typeof: typeof deleteChat });
            
            // Try to get deleteChat directly from MessageService if not available through context
            try {
              // Import dynamically only if needed
              const MessageService = await import('../../../services/MessageService').then(module => module.default);
              
              const chatId = context?.chatId || message?.chatId;
              if (!chatId) {
                throw new Error('No chat ID found for deletion');
              }
              
              console.log('Calling MessageService.deleteChat directly for chat ID:', chatId);
              await MessageService.deleteChat(chatId, user.uid);
              console.log('Successfully deleted chat using direct MessageService call');
              return;
            } catch (importError) {
              console.error('Error importing or using MessageService directly:', importError);
              alert('Unable to delete message at this time. This feature is still being implemented for direct chats.');
              return;
            }
          }
          
          try {
            // Get the correct chatId - could be context.chatId, selectedChat, or from message
            const chatId = context?.chatId || message?.chatId;
            if (!chatId) {
              throw new Error('No chat ID found for deletion');
            }
            
            console.log('Deleting chat with ID:', chatId);
            await deleteChat(chatId, user.uid);
            console.log('Successfully deleted chat');
          } catch (chatError) {
            console.error('Error deleting chat:', chatError);
            throw chatError; // Re-throw to be caught by the outer try/catch
          }
          return;
        }
        
        // For standard messages
        if (message?.fileAttachment?.path) {
          await deleteMessageWithFile(messageId, user.uid, message.fileAttachment.path);
        } else {
          await deleteMessage(messageId, user.uid);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Show a user-friendly error message
      alert('There was an error deleting this message. Please try again later.');
    }
  }, [messages, deleteMessage, deleteMessageWithFile, deleteChat, user?.uid, contextType, context]);

  const handleEditMessage = useCallback(async (messageId, newText) => {
    if (!user?.uid) return;
    
    try {
      await editMessage(messageId, newText, user.uid);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  }, [editMessage, user?.uid]);

  // Handle manual notification clearing
  const handleClearNotifications = useCallback(async () => {
    if (!user?.uid || !contextId) return;
    
    let tabType;
    switch (activeTab) {
      case 'broadcast':
        tabType = 'broadcast';
        break;
      case 'discussion':
        tabType = 'discussion';
        break;
      case 'private':
        tabType = 'private';
        break;
      default:
        tabType = activeTab;
    }
    
    try {
      await NotificationService.markTabNotificationsAsRead(
        user.uid,
        contextType,
        contextId,
        tabType
      );
      notificationsClearedRef.current = true;
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [user?.uid, contextId, activeTab, contextType]);

  // Added improved close handler
  const handleClose = () => {
    if (typeof onClose === 'function') {
      // Ensure we clean up properly before closing
      subscriptionsRef.current.forEach(unsub => {
        if (typeof unsub === 'function') {
          try {
            unsub();
          } catch (e) {
            console.error('Error during unsubscribe on close:', e);
          }
        }
      });
      subscriptionsRef.current = [];
      
      // Call the provided onClose function
      onClose();
    }
  };

  // Memoize filtered messages to prevent recalculation on every render
  const filteredMessages = React.useMemo(() => {
    // For personal messages, show all
    if (contextType === 'personal') {
      return messages;
    }
    
    return messages.filter(msg => {
      switch (activeTab) {
        case 'broadcast':
          return msg.type === `${contextType}_broadcast`;
        case 'discussion':
          return msg.type === `${contextType}_discussion`;
        case 'private':
          // For private messages, filter based on sender/recipient
          if (msg.type !== `${contextType}_private`) return false;
          
          if (isLeader && selectedRecipient) {
            return (msg.senderId === user?.uid && msg.recipientId === selectedRecipient.uid) ||
                   (msg.senderId === selectedRecipient.uid && msg.recipientId === user?.uid);
          } else if (!isLeader) {
            return (msg.senderId === user?.uid && msg.recipientId === context.instructorId) ||
                   (msg.senderId === context.instructorId && msg.recipientId === user?.uid);
          }
          return false;
        default:
          return false;
      }
    });
  }, [messages, activeTab, contextType, isLeader, selectedRecipient, user?.uid, context?.instructorId]);

  // Render different UI for embedded vs modal usage
  if (isEmbedded) {
    // Simplified embedded UI (no modals, backdrops)
    return (
      <div className="flex flex-col h-full">
        {/* For embedded, only show the tab bar for non-personal contexts */}
        {contextType !== 'personal' && (
          <div className="flex px-6 border-b">
            {/* Show broadcast tab for leaders only */}
            {(isLeader || activeTab === 'broadcast') && (
              <button
                onClick={() => setActiveTab('broadcast')}
                className={`px-5 py-3 flex items-center gap-2 border-b-2 transition-colors
                  ${activeTab === 'broadcast' 
                    ? 'border-[#4460F1] text-[#4460F1]' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Megaphone size={18} />
                <span>Broadcasts</span>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('discussion')}
              className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                ${activeTab === 'discussion' 
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare size={18} />
              <span>{contextType === 'course' ? 'Class Discussion' : 'Trip Discussion'}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('private')}
              className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                ${activeTab === 'private' 
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <User size={18} />
              <span>{isLeader ? 'Direct Messages' : `Message ${contextType === 'course' ? 'Instructor' : 'Trip Leader'}`}</span>
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <EnhancedErrorAlert 
            error={error} 
            className="mx-4 mt-4"
            onRetry={() => {
              if (contextId && user?.uid) {
                const idField = contextType === 'course' ? 'courseId' 
                              : contextType === 'trip' ? 'tripId' 
                              : 'chatId';
                
                const params = {
                  type: contextType,
                  [idField]: contextId,
                  messageType: activeTab === 'broadcast' 
                    ? `${contextType}_broadcast` 
                    : `${contextType}_discussion`,
                };
                subscribeToMessages(params);
              }
            }}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {isSearching ? (
            <SearchResults
              currentUserId={user?.uid}
              onDeleteMessage={handleDeleteMessage}
              onEditMessage={handleEditMessage}
              isInstructor={isLeader}
              isEmbedded={true}
            />
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={false}
                  isInstructor={isLeader}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  touchedMessageId={touchedMessageId}
                  setTouchedMessageId={setTouchedMessageId}
                  isSmallScreen={isSmallScreen}
                  isEmbedded={true}
                />
              
                {/* Add typing indicator */}
                {typingUsers && typingUsers.length > 0 && (
                  <TypingIndicator 
                    typingUsers={typingUsers} 
                    userProfiles={userProfiles}
                    currentUserId={user?.uid}
                  />
                )}
              </div>
              <div className="flex-shrink-0">
                <MessageInput
                  onSend={(text, file) => handleSendMessage(text, file)}
                  placeholder="Type a message..."
                  isSending={isSending}
                  sendError={sendError}
                  typingParams={{
                    type: contextType,
                    [contextType === 'course' ? 'courseId' : contextType === 'trip' ? 'tripId' : 'chatId']: contextId,
                    messageType: contextType === 'personal' ? 'chat' : `${contextType}_discussion`
                  }}
                  onTypingStatus={setTypingStatus}
                  hasLargerSendButton={isSmallScreen}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Standard modal version
  // Show loading state during initialization
  if (!isOpen) return null;
  
  if (!isStable && isComponentMounted.current) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100">
        <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
        
        <div className="relative flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-4xl h-[36rem] flex flex-col overflow-hidden bg-white shadow-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-xl text-gray-800">
                {context?.name} - Loading...
              </h2>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-target"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-100" ref={dialogRef}>
      <div 
        className="absolute inset-0 bg-black/30" 
        onClick={handleClose}
      />
      
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-4xl h-[36rem] flex flex-col overflow-hidden bg-white shadow-lg">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl text-gray-800">
              {contextType === 'course' ? context?.name : context?.location} - 
              {contextType === 'course' ? ' Course' : contextType === 'trip' ? ' Trip' : ' Chat'} Communications
            </h2>
            <div className="flex items-center">
              <button 
                onClick={handleClearNotifications}
                className="text-xs text-blue-600 hover:text-blue-800 mr-4"
              >
                Mark All as Read
              </button>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors touch-target"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {error && (
            <EnhancedErrorAlert 
              error={error} 
              className="mx-4 mt-4"
              onRetry={() => {
                if (contextId && user?.uid) {
                  const idField = contextType === 'course' ? 'courseId' 
                                : contextType === 'trip' ? 'tripId' 
                                : 'chatId';
                  
                  const params = {
                    type: contextType,
                    [idField]: contextId,
                    messageType: activeTab === 'broadcast' 
                      ? `${contextType}_broadcast` 
                      : `${contextType}_discussion`,
                  };
                  subscribeToMessages(params);
                }
              }}
            />
          )}

          {/* Tabs - Only show for course and trip */}
          {contextType !== 'personal' && (
            <div className="flex px-6 border-b">
              {/* Show broadcast tab for leaders only */}
              {(isLeader || activeTab === 'broadcast') && (
                <button
                  onClick={() => setActiveTab('broadcast')}
                  className={`px-5 py-3 flex items-center gap-2 border-b-2 transition-colors
                    ${activeTab === 'broadcast' 
                      ? 'border-[#4460F1] text-[#4460F1]' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Megaphone size={18} />
                  <span>Broadcasts</span>
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('discussion')}
                className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                  ${activeTab === 'discussion' 
                    ? 'border-[#4460F1] text-[#4460F1]' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <MessageSquare size={18} />
                <span>{contextType === 'course' ? 'Class Discussion' : 'Trip Discussion'}</span>
              </button>
              
              <button
                onClick={() => setActiveTab('private')}
                className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                  ${activeTab === 'private' 
                    ? 'border-[#4460F1] text-[#4460F1]' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <User size={18} />
                <span>{isLeader ? 'Direct Messages' : `Message ${contextType === 'course' ? 'Instructor' : 'Trip Leader'}`}</span>
              </button>
            </div>
          )}

          {/* Search Bar - For discussion and broadcast tabs */}
          {activeTab !== 'private' && contextType !== 'personal' && (
            <div className="px-6 py-3 border-b">
              <SearchBar 
                params={{
                  type: contextType,
                  [contextType === 'course' ? 'courseId' : 'tripId']: contextId,
                  messageType: activeTab === 'broadcast' 
                    ? `${contextType}_broadcast` 
                    : `${contextType}_discussion`
                }}
              />
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            {isSearching ? (
              <SearchResults
                currentUserId={user?.uid}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
                isInstructor={isLeader}
                isEmbedded={false}
              />
            ) : activeTab === 'broadcast' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages.map(msg => ({
                    ...msg,
                    // Force the broadcast flag for broadcast messages
                    isBroadcast: true
                  }))}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={true}
                  isInstructor={isLeader}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  touchedMessageId={touchedMessageId}
                  setTouchedMessageId={setTouchedMessageId}
                  isSmallScreen={isSmallScreen}
                  isEmbedded={false}
                />
                </div>
                {isLeader && (
                  <div className="flex-shrink-0">
                    <MessageInput
                      onSend={(text, file) => handleSendMessage(text, file, 'broadcast')}
                      placeholder={`Send a broadcast message to all ${contextType === 'course' ? 'students' : 'participants'}...`}
                      isSending={isSending}
                      sendError={sendError}
                      typingParams={{
                        type: contextType,
                        [contextType === 'course' ? 'courseId' : 'tripId']: contextId,
                        messageType: `${contextType}_broadcast`
                      }}
                      onTypingStatus={setTypingStatus}
                      hasLargerSendButton={isSmallScreen}
                    />
                  </div>
                )}
              </div>
            ) : activeTab === 'discussion' || contextType === 'personal' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={false}
                  isInstructor={isLeader}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                  touchedMessageId={touchedMessageId}
                  setTouchedMessageId={setTouchedMessageId}
                  isSmallScreen={isSmallScreen}
                  isEmbedded={false}
                />
                
                {/* Add typing indicator */}
                {typingUsers && typingUsers.length > 0 && (
                  <TypingIndicator 
                    typingUsers={typingUsers} 
                    userProfiles={userProfiles}
                    currentUserId={user?.uid}
                  />
                )}
              </div>
                <div className="flex-shrink-0">
                <MessageInput
                  onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                  placeholder={isLeader ? "Start a discussion..." : "Type a message..."}
                  isSending={isSending}
                  sendError={sendError}
                  typingParams={{
                    type: contextType,
                    [contextType === 'course' ? 'courseId' : contextType === 'trip' ? 'tripId' : 'chatId']: contextId,
                    messageType: contextType === 'personal' ? 'chat' : `${contextType}_discussion`
                  }}
                  onTypingStatus={setTypingStatus}
                  hasLargerSendButton={isSmallScreen}
                />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {isLeader ? (
                  <>
                    {/* Member list */}
                    <div className="w-80 flex-shrink-0 border-r flex flex-col">
                      <div className="p-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${contextType === 'course' ? 'students' : 'participants'}...`}
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {filteredMembers.map(member => (
                          <button
                            key={member.uid}
                            onClick={() => setSelectedRecipient(member)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors
                              ${selectedRecipient?.uid === member.uid ? 'bg-[#4460F1]/5 hover:bg-[#4460F1]/5' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-sm text-gray-600">
                                  {member.displayName
                                    ?.split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || '??'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-800 truncate">
                                  {member.displayName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                      {selectedRecipient ? (
                        <>
                          <div className="flex-1 overflow-y-auto">
                          <MessageList
                            messages={filteredMessages}
                            currentUserId={user?.uid}
                            onDeleteMessage={handleDeleteMessage}
                            onEditMessage={handleEditMessage}
                            onReactionSelect={handleReaction}
                            loading={loading}
                            loadingMore={loadingMore}
                            error={error}
                            showBroadcastIndicator={false}
                            isInstructor={isLeader}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                            touchedMessageId={touchedMessageId}
                            setTouchedMessageId={setTouchedMessageId}
                            isSmallScreen={isSmallScreen}
                            isEmbedded={false}
                          />
                          
                          {/* Add typing indicator */}
                          {typingUsers && typingUsers.length > 0 && (
                            <TypingIndicator 
                              typingUsers={typingUsers} 
                              userProfiles={userProfiles}
                              currentUserId={user?.uid}
                            />
                          )}
                        </div>
                          <div className="flex-shrink-0">
                          <MessageInput
                            onSend={(text, file) => handleSendMessage(text, file, 'private', selectedRecipient.uid)}
                            placeholder={`Message ${selectedRecipient.displayName}...`}
                            isSending={isSending}
                            sendError={sendError}
                            typingParams={{
                              type: contextType,
                              [contextType === 'course' ? 'courseId' : 'tripId']: contextId,
                              messageType: `${contextType}_private`,
                              recipientId: selectedRecipient.uid
                            }}
                            onTypingStatus={setTypingStatus}
                            hasLargerSendButton={isSmallScreen}
                          />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <div className="text-3xl mb-3">👋</div>
                            <p>Select a {contextType === 'course' ? 'student' : 'participant'} to start messaging</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto">
                    <MessageList
                      messages={filteredMessages}
                      currentUserId={user?.uid}
                      onDeleteMessage={handleDeleteMessage}
                      onEditMessage={handleEditMessage}
                      onReactionSelect={handleReaction}
                      loading={loading}
                      loadingMore={loadingMore}
                      error={error}
                      showBroadcastIndicator={false}
                      isInstructor={isLeader}
                      hasMore={hasMore}
                      onLoadMore={handleLoadMore}
                      touchedMessageId={touchedMessageId}
                      setTouchedMessageId={setTouchedMessageId}
                      isSmallScreen={isSmallScreen}
                      isEmbedded={false}
                    />
                    
                    {/* Add typing indicator */}
                    {typingUsers && typingUsers.length > 0 && (
                      <TypingIndicator 
                        typingUsers={typingUsers} 
                        userProfiles={userProfiles}
                        currentUserId={user?.uid}
                      />
                    )}
                  </div>
                  <MessageInput
                    onSend={(text, file) => handleSendMessage(text, file, 'private', context.instructorId)}
                    placeholder={`Message ${contextType === 'course' ? 'instructor' : 'trip leader'}...`}
                    isSending={isSending}
                    sendError={sendError}
                    typingParams={{
                      type: contextType,
                      [contextType === 'course' ? 'courseId' : 'tripId']: contextId,
                      messageType: `${contextType}_private`,
                      recipientId: context.instructorId
                    }}
                    onTypingStatus={setTypingStatus}
                    hasLargerSendButton={isSmallScreen}
                  />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UnifiedMessaging;