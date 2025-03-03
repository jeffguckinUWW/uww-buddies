import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import MessageService from '../services/MessageService';
import { arrayUnion } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { handleError, AppError, ErrorTypes } from '../lib/utils';

const MessageContext = createContext();

// Helper function to merge messages
const mergeMessages = (existingMessages, newMessages, isOlder = false) => {
  const messageMap = new Map();
  
  // Add existing messages to map
  existingMessages.forEach(msg => messageMap.set(msg.id, msg));
  
  // Add or update with new messages
  newMessages.forEach(msg => {
    const existingMsg = messageMap.get(msg.id);
    if (existingMsg && msg.type?.includes('broadcast')) {
      // Merge broadcast read status
      messageMap.set(msg.id, {
        ...msg,
        readStatus: {
          ...(existingMsg.readStatus || {}),
          ...(msg.readStatus || {})
        },
        readCount: Math.max(existingMsg.readCount || 0, msg.readCount || 0),
        readBy: Array.from(new Set([...(existingMsg.readBy || []), ...(msg.readBy || [])]))
      });
    } else {
      messageMap.set(msg.id, msg);
    }
  });
  
  // Convert back to array and sort by timestamp
  const messages = Array.from(messageMap.values())
    .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

  return messages;
};

// Action types
const MESSAGE_ACTIONS = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  ADD_OLDER_MESSAGES: 'ADD_OLDER_MESSAGES',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  EDIT_MESSAGE: 'EDIT_MESSAGE',
  UPDATE_MESSAGE_READ_STATUS: 'UPDATE_MESSAGE_READ_STATUS',
  SET_LOADING: 'SET_LOADING',
  SET_LOADING_MORE: 'SET_LOADING_MORE',
  SET_ERROR: 'SET_ERROR',
  SET_HAS_MORE: 'SET_HAS_MORE',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  SET_BUDDIES: 'SET_BUDDIES',
  UPDATE_BUDDY_STATUS: 'UPDATE_BUDDY_STATUS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_SEARCH_LOADING: 'SET_SEARCH_LOADING',
  SET_SEARCH_ERROR: 'SET_SEARCH_ERROR',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  SET_FILE_UPLOAD_PROGRESS: 'SET_FILE_UPLOAD_PROGRESS',
  SET_FILE_UPLOAD_ERROR: 'SET_FILE_UPLOAD_ERROR',
  CLEAR_FILE_UPLOAD: 'CLEAR_FILE_UPLOAD',
  UPDATE_MESSAGE_REACTIONS: 'UPDATE_MESSAGE_REACTIONS',
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  SET_TYPING_SUBSCRIPTION: 'SET_TYPING_SUBSCRIPTION',
  SET_MESSAGE_SUBSCRIPTION: 'SET_MESSAGE_SUBSCRIPTION',
};

// Initial state
const initialState = {
  messages: [],
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: true,
  currentChatId: null,
  currentCourseId: null,
  currentTripId: null,
  buddies: [],
  buddyRequests: [],
  messageSubscription: null,
  searchResults: [],
  searchLoading: false,
  searchError: null,
  isSearching: false,
  fileUploadProgress: 0,
  fileUploadError: null,
  typingUsers: [],
  typingSubscription: null
};

// Reducer
const messageReducer = (state, action) => {
  switch (action.type) {
    case MESSAGE_ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: mergeMessages(state.messages, action.payload.messages),
        hasMore: action.payload.hasMore,
        loading: false,
        error: null
      };

    case MESSAGE_ACTIONS.SET_TYPING_USERS:
      return {
        ...state,
        typingUsers: action.payload
      };
    
    case MESSAGE_ACTIONS.SET_TYPING_SUBSCRIPTION:
      return {
        ...state,
        typingSubscription: action.payload
      };

    case MESSAGE_ACTIONS.SET_MESSAGE_SUBSCRIPTION:
      return {
        ...state,
        messageSubscription: action.payload
      };  

    case MESSAGE_ACTIONS.ADD_MESSAGE:
      if (state.messages.some(msg => msg.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        messages: mergeMessages(state.messages, [action.payload])
      };

    case MESSAGE_ACTIONS.ADD_OLDER_MESSAGES:
      return {
        ...state,
        messages: mergeMessages(state.messages, action.payload.messages, true),
        hasMore: action.payload.hasMore,
        loadingMore: false
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        )
      };

    case MESSAGE_ACTIONS.EDIT_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { 
                ...msg, 
                text: action.payload.text,
                isEdited: true,
                lastEditedAt: action.payload.lastEditedAt,
                editHistory: action.payload.editHistory
              } 
            : msg
        )
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_READ_STATUS:
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === action.payload.messageId) {
            return {
              ...msg,
              readStatus: {
                ...msg.readStatus,
                [action.payload.userId]: {
                  read: true,
                  readAt: action.payload.readAt
                }
              },
              readCount: (msg.readCount || 0) + 1,
              readBy: [...(msg.readBy || []), action.payload.userId]
            };
          }
          return msg;
        })
      };

    case MESSAGE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case MESSAGE_ACTIONS.SET_LOADING_MORE:
      return {
        ...state,
        loadingMore: action.payload
      };

    case MESSAGE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
        loadingMore: false
      };

    case MESSAGE_ACTIONS.SET_HAS_MORE:
      return {
        ...state,
        hasMore: action.payload
      };

    case MESSAGE_ACTIONS.CLEAR_MESSAGES:
      return {
        ...state,
        messages: [],
        hasMore: true,
        error: null
      };

    case MESSAGE_ACTIONS.SET_BUDDIES:
      return {
        ...state,
        buddies: action.payload
      };

    case MESSAGE_ACTIONS.UPDATE_BUDDY_STATUS:
      return {
        ...state,
        buddies: action.payload.isAdding 
          ? [...state.buddies, action.payload.buddyId]
          : state.buddies.filter(id => id !== action.payload.buddyId)
      };

    case MESSAGE_ACTIONS.UPDATE_MESSAGE_REACTIONS:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, reactions: action.payload.reactions } 
            : msg
        )
      };

    case MESSAGE_ACTIONS.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        searchLoading: false,
        isSearching: true
      };
    
    case MESSAGE_ACTIONS.SET_SEARCH_LOADING:
      return {
        ...state,
        searchLoading: action.payload
      };
    
    case MESSAGE_ACTIONS.SET_SEARCH_ERROR:
      return {
        ...state,
        searchError: action.payload,
        searchLoading: false
      };
    
    case MESSAGE_ACTIONS.CLEAR_SEARCH:
      return {
        ...state,
        searchResults: [],
        searchError: null,
        isSearching: false
      };
    
    case MESSAGE_ACTIONS.SET_FILE_UPLOAD_PROGRESS:
      return {
        ...state,
        fileUploadProgress: action.payload,
        fileUploadError: null
      };
    
    case MESSAGE_ACTIONS.SET_FILE_UPLOAD_ERROR:
      return {
        ...state,
        fileUploadError: action.payload,
        fileUploadProgress: 0
      };
    
    case MESSAGE_ACTIONS.CLEAR_FILE_UPLOAD:
      return {
        ...state,
        fileUploadProgress: 0,
        fileUploadError: null
      };

    default:
      return state;
  }
};

// Helper function to get users who reacted with an emoji
const getUsersForReaction = (reaction) => {
  if (!reaction || !reaction.users) return [];
  
  return Object.entries(reaction.users).map(([userId, data]) => ({
    id: userId,
    name: data.name,
    timestamp: data.timestamp
  }));
};

// Provider component
export const MessageProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(messageReducer, initialState);
  
  // Refs for subscriptions
  const subscriptionsRef = useRef({
    messageSubscription: null,
    typingSubscription: null
  });
  
  // Helper to safely unsubscribe
  const safeUnsubscribe = useCallback((subscriptionType) => {
    const currentSub = subscriptionsRef.current[subscriptionType];
    if (typeof currentSub === 'function') {
      try {
        currentSub();
        subscriptionsRef.current[subscriptionType] = null;
      } catch (error) {
        console.error(`Error unsubscribing from ${subscriptionType}:`, error);
      }
    }
  }, []);

  const handleMessagesUpdate = useCallback(({ messages, error, hasMore }) => {
    if (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error });
    } else {
      dispatch({ 
        type: MESSAGE_ACTIONS.SET_MESSAGES, 
        payload: { messages, hasMore } 
      });
    }
  }, []);

  const handleTypingUpdate = useCallback((typingUsers) => {
    dispatch({ 
      type: MESSAGE_ACTIONS.SET_TYPING_USERS, 
      payload: Array.isArray(typingUsers) ? typingUsers : []
    });
  }, []);
  
  const subscribeToTypingStatus = useCallback((params) => {
    // Clean up previous subscription
    safeUnsubscribe('typingSubscription');
    
    let unsubscribe = null;
    
    try {
      // Create new subscription
      unsubscribe = MessageService.subscribeToTypingStatus(params, handleTypingUpdate);
      
      // Store subscription
      subscriptionsRef.current.typingSubscription = unsubscribe;
      dispatch({ type: MESSAGE_ACTIONS.SET_TYPING_SUBSCRIPTION, payload: unsubscribe });
    } catch (error) {
      console.error('Error in subscribeToTypingStatus:', error);
      // Don't throw the error, just return a no-op function
      unsubscribe = () => {};
    }
    
    return unsubscribe || (() => {});
  }, [handleTypingUpdate, safeUnsubscribe]);
  
  const setTypingStatus = useCallback(async (params, isTyping = true) => {
    if (!user?.uid) return;
    
    try {
      await MessageService.setTypingStatus(params, user.uid, isTyping);
    } catch (error) {
      // Log but don't crash the app
      console.error('Error setting typing status:', error);
    }
  }, [user?.uid]);

  const sendMessageWithFile = useCallback(async (messageData, file) => {
    try {
      // Input validation
      if (!messageData) {
        throw new AppError('Message data is required', ErrorTypes.VALIDATION);
      }
      
      if (!file) {
        throw new AppError('File is required', ErrorTypes.VALIDATION);
      }
      
      // Reset any previous upload state
      dispatch({ type: MESSAGE_ACTIONS.CLEAR_FILE_UPLOAD });
      
      // Send message with file
      const message = await MessageService.sendMessageWithFile(messageData, file);
      
      dispatch({
        type: MESSAGE_ACTIONS.ADD_MESSAGE,
        payload: message
      });
      
      return message;
    } catch (error) {
      const formattedError = handleError(error, 'sendMessageWithFile');
      dispatch({ 
        type: MESSAGE_ACTIONS.SET_FILE_UPLOAD_ERROR, 
        payload: formattedError.message 
      });
      throw formattedError;
    }
  }, [dispatch]);

  const addReaction = useCallback(async (messageId, emoji) => {
    if (!messageId || !emoji) {
      console.warn('Missing parameters for reaction:', { messageId, emoji });
      return;
    }
    
    if (!user || !user.uid) {
      console.warn('User must be logged in to add reactions');
      return;
    }
    
    try {
      // Get existing message to ensure it exists
      const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) {
        console.warn('Cannot add reaction to non-existent message');
        return;
      }
      
      // Get user display name with fallbacks
      const userName = user.displayName || user.email || 'Unknown User';
      
      // Optimistically update UI
      const message = state.messages[messageIndex];
      const currentReactions = message.reactions || {};
      let updatedReactions = { ...currentReactions };
      
      // Check if emoji exists in reactions
      if (!updatedReactions[emoji]) {
        // Add new emoji reaction
        updatedReactions[emoji] = {
          count: 1,
          users: {
            [user.uid]: {
              name: userName,
              timestamp: new Date()
            }
          }
        };
      } else {
        // Check if user already reacted with this emoji
        const hasReacted = updatedReactions[emoji].users?.[user.uid];
        
        if (hasReacted) {
          // User already reacted, so remove their reaction
          const { [user.uid]: _, ...remainingUsers } = updatedReactions[emoji].users;
          const newCount = Math.max(0, (updatedReactions[emoji].count || 1) - 1);
          
          if (newCount === 0) {
            // No reactions left for this emoji, remove it
            const { [emoji]: __, ...remainingEmojis } = updatedReactions;
            updatedReactions = remainingEmojis;
          } else {
            // Update count and users
            updatedReactions[emoji] = {
              count: newCount,
              users: remainingUsers
            };
          }
        } else {
          // Add user's reaction
          updatedReactions[emoji] = {
            count: (updatedReactions[emoji].count || 0) + 1,
            users: {
              ...updatedReactions[emoji].users,
              [user.uid]: {
                name: userName,
                timestamp: new Date()
              }
            }
          };
        }
      }
      
      // Update local state optimistically
      dispatch({
        type: MESSAGE_ACTIONS.UPDATE_MESSAGE_REACTIONS,
        payload: {
          id: messageId,
          reactions: updatedReactions
        }
      });
      
      // Call Firebase to update
      const result = await MessageService.addReaction(
        messageId, 
        user.uid, 
        emoji,
        userName
      );
      
      return result;
    } catch (error) {
      console.error('Error adding reaction:', error);
      
      // Show error in UI but don't throw (to avoid breaking component)
      dispatch({ 
        type: MESSAGE_ACTIONS.SET_ERROR, 
        payload: 'Failed to add reaction' 
      });
    }
  }, [user, state.messages, dispatch]);

  const searchMessages = useCallback(async (params) => {
    try {
      dispatch({ type: MESSAGE_ACTIONS.SET_SEARCH_LOADING, payload: true });
      
      const results = await MessageService.searchMessages({
        ...params,
        userId: user?.uid
      });
      
      dispatch({
        type: MESSAGE_ACTIONS.SET_SEARCH_RESULTS,
        payload: results.messages
      });
    } catch (error) {
      dispatch({
        type: MESSAGE_ACTIONS.SET_SEARCH_ERROR,
        payload: error.message
      });
    }
  }, [user?.uid, dispatch]);
  
  const clearSearch = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_SEARCH });
  }, [dispatch]);

  const subscribeToMessages = useCallback((params) => {
    // First, unsubscribe from any existing message subscription
    safeUnsubscribe('messageSubscription');
    
    // Clear existing messages and set loading state
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGES });
    dispatch({ type: MESSAGE_ACTIONS.SET_LOADING, payload: true });
    
    // Create new subscription with a small delay to ensure previous one is cleaned up
    setTimeout(() => {
      try {
        const unsubscribe = MessageService.subscribeToMessages(params, handleMessagesUpdate);
        
        // Store the new subscription
        subscriptionsRef.current.messageSubscription = unsubscribe;
        dispatch({ type: MESSAGE_ACTIONS.SET_MESSAGE_SUBSCRIPTION, payload: unsubscribe });
      } catch (error) {
        console.error('Error creating message subscription:', error);
        dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      }
    }, 50);
    
    // Return a function to unsubscribe
    return () => {
      // The string 'messageSubscription' is stable and won't change
      const subscriptionType = 'messageSubscription';
      
      // We use the current value of safeUnsubscribe when the cleanup runs
      safeUnsubscribe(subscriptionType);
    };
  }, [handleMessagesUpdate, safeUnsubscribe]);

  const loadMoreMessages = useCallback(async (params) => {
    if (!state.hasMore || state.loadingMore) return;

    try {
      dispatch({ type: MESSAGE_ACTIONS.SET_LOADING_MORE, payload: true });
      
      const oldestMessage = state.messages[0];
      const result = await MessageService.fetchOlderMessages(params, oldestMessage);
      
      dispatch({
        type: MESSAGE_ACTIONS.ADD_OLDER_MESSAGES,
        payload: {
          messages: result.messages,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
    }
  }, [state.messages, state.hasMore, state.loadingMore, dispatch]);

  const sendMessage = useCallback(async (messageData) => {
    try {
      // Input validation
      if (!messageData) {
        throw new AppError('Message data is required', ErrorTypes.VALIDATION);
      }
      
      // For broadcast messages, ensure readTracking is set if required
      if (messageData.type?.includes('broadcast') && !messageData.readStatus) {
        console.warn('Broadcast message missing readStatus property');
      }
      
      const message = await MessageService.sendMessage(messageData);
      dispatch({
        type: MESSAGE_ACTIONS.ADD_MESSAGE,
        payload: message
      });
      return message;
    } catch (error) {
      const formattedError = handleError(error, 'MessageContext:sendMessage');
      dispatch({ 
        type: MESSAGE_ACTIONS.SET_ERROR, 
        payload: formattedError 
      });
      throw formattedError;
    }
  }, [dispatch]);

  const editMessage = useCallback(async (messageId, newText, userId) => {
    try {
      const updatedMessage = await MessageService.editMessage(messageId, newText, userId);
      dispatch({
        type: MESSAGE_ACTIONS.EDIT_MESSAGE,
        payload: updatedMessage
      });
      return updatedMessage;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const markAsRead = useCallback(async (messageId, userId) => {
    try {
      const messageIndex = state.messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      const message = state.messages[messageIndex];
      
      if (message.readBy?.includes(userId)) return;

      if (message.type?.includes('broadcast')) {
        if (!message.readStatus?.[userId]?.read) {
          await MessageService.markAsRead(messageId, userId, true);
          
          dispatch({
            type: MESSAGE_ACTIONS.UPDATE_MESSAGE_READ_STATUS,
            payload: {
              messageId,
              userId,
              readAt: new Date()
            }
          });
        }
      } else {
        await MessageService.markAsRead(messageId, userId, false);
        dispatch({
          type: MESSAGE_ACTIONS.UPDATE_MESSAGE,
          payload: {
            id: messageId,
            readBy: arrayUnion(userId)
          }
        });
      }
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [state.messages, dispatch]);

  const deleteMessage = useCallback(async (messageId, userId) => {
    try {
      await MessageService.deleteMessage(messageId, userId);
      dispatch({
        type: MESSAGE_ACTIONS.UPDATE_MESSAGE,
        payload: {
          id: messageId,
          deletedFor: arrayUnion(userId)
        }
      });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const deleteMessageWithFile = useCallback(async (messageId, userId, filePath) => {
    try {
      // Input validation
      if (!messageId) {
        throw new AppError('Message ID is required', ErrorTypes.VALIDATION);
      }
      
      if (!userId) {
        throw new AppError('User ID is required', ErrorTypes.VALIDATION);
      }
      
      if (filePath) {
        try {
          await MessageService.deleteFile(filePath);
        } catch (fileError) {
          console.error('Error deleting file:', fileError);
          // Continue with message deletion even if file deletion fails
        }
      }
      
      await deleteMessage(messageId, userId);
    } catch (error) {
      const formattedError = handleError(error, 'deleteMessageWithFile');
      dispatch({ 
        type: MESSAGE_ACTIONS.SET_ERROR, 
        payload: formattedError 
      });
      throw formattedError;
    }
  }, [deleteMessage, dispatch]);

  const deleteChat = useCallback(async (chatId, userId) => {
    try {
      await MessageService.deleteChat(chatId, userId);
      dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGES });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const getBuddies = useCallback(async (userId) => {
    try {
      const buddies = await MessageService.getBuddies(userId);
      dispatch({ type: MESSAGE_ACTIONS.SET_BUDDIES, payload: buddies });
      return buddies;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const checkBuddyStatus = useCallback(async (userId1, userId2) => {
    try {
      return await MessageService.checkBuddyStatus(userId1, userId2);
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  const getOrCreateBuddyChat = useCallback(async (userId1, userId2) => {
    try {
      return await MessageService.getOrCreateBuddyChat(userId1, userId2);
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, [dispatch]);

  // Cleanup all subscriptions when component unmounts - fixed to avoid the ESLint warning
  useEffect(() => {
    // Store a reference to the current unsubscribe functions
    const unsubscribeFns = {
      messageSubscription: (subscriptionsRef.current.messageSubscription) || null,
      typingSubscription: (subscriptionsRef.current.typingSubscription) || null
    };
    
    return () => {
      // Use the captured unsubscribe functions, not the ref
      Object.values(unsubscribeFns).forEach(unsubFn => {
        if (typeof unsubFn === 'function') {
          try {
            unsubFn();
          } catch (error) {
            console.error('Error during cleanup:', error);
          }
        }
      });
    };
  }, []);

  const value = {
    ...state,
    subscribeToMessages,
    loadMoreMessages,
    sendMessage,
    editMessage,
    markAsRead,
    deleteMessage,
    deleteChat,
    getBuddies,
    checkBuddyStatus,
    getOrCreateBuddyChat,
    dispatch,
    searchResults: state.searchResults,
    searchLoading: state.searchLoading,
    searchError: state.searchError,
    isSearching: state.isSearching,
    searchMessages,
    clearSearch,
    fileUploadProgress: state.fileUploadProgress,
    fileUploadError: state.fileUploadError,
    sendMessageWithFile,
    deleteMessageWithFile,
    addReaction,
    
    // Fixed implementation of these methods to avoid 'this' binding issues
    getCommonEmojis: () => MessageService.getCommonEmojis(),
    getSortedReactions: (reactions) => {
      if (!reactions) return [];
      
      return Object.entries(reactions)
        .map(([emoji, data]) => ({
          emoji,
          count: data.count,
          users: getUsersForReaction(data)
        }))
        .sort((a, b) => b.count - a.count);
    },
    
    typingUsers: state.typingUsers,
    subscribeToTypingStatus,
    setTypingStatus
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

// Custom hook
export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};

export default MessageContext;