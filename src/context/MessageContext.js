import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import MessageService from '../services/MessageService';
import { arrayUnion } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';  // Adjust path if needed
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
  ADD_REPLY: 'ADD_REPLY',
  SET_THREAD_MESSAGES: 'SET_THREAD_MESSAGES',
  CLEAR_THREAD: 'CLEAR_THREAD',
  UPDATE_THREAD_MESSAGE: 'UPDATE_THREAD_MESSAGE',
  SET_THREAD_LOADING: 'SET_THREAD_LOADING',
  SET_THREAD_ERROR: 'SET_THREAD_ERROR',
  ADD_OLDER_THREAD_MESSAGES: 'ADD_OLDER_THREAD_MESSAGES',
  SET_THREAD_HAS_MORE: 'SET_THREAD_HAS_MORE',
  SET_THREAD_SUBSCRIPTION: 'SET_THREAD_SUBSCRIPTION',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  SET_SEARCH_LOADING: 'SET_SEARCH_LOADING',
  SET_SEARCH_ERROR: 'SET_SEARCH_ERROR',
  CLEAR_SEARCH: 'CLEAR_SEARCH',
  SET_FILE_UPLOAD_PROGRESS: 'SET_FILE_UPLOAD_PROGRESS',
  SET_FILE_UPLOAD_ERROR: 'SET_FILE_UPLOAD_ERROR',
  CLEAR_FILE_UPLOAD: 'CLEAR_FILE_UPLOAD',
  UPDATE_MESSAGE_REACTIONS: 'UPDATE_MESSAGE_REACTIONS',
  SET_TYPING_USERS: 'SET_TYPING_USERS',
  SET_TYPING_SUBSCRIPTION: 'SET_TYPING_SUBSCRIPTION'
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
  threadMessages: [],
  activeThreadId: null,
  threadLoading: false,
  threadError: null,
  threadHasMore: true,
  threadLoadingMore: false,
  threadSubscription: null,
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

    case MESSAGE_ACTIONS.ADD_REPLY:
      return {
        ...state,
        messages: mergeMessages(state.messages, [action.payload]),
        threadMessages: action.payload.parentMessageId === state.activeThreadId 
          ? [...state.threadMessages, action.payload]
          : state.threadMessages
      };

    case MESSAGE_ACTIONS.SET_THREAD_MESSAGES:
      return {
        ...state,
        threadMessages: action.payload.messages,
        activeThreadId: action.payload.threadId,
        threadLoading: false,
        threadError: null
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

    case MESSAGE_ACTIONS.CLEAR_THREAD:
      return {
        ...state,
        threadMessages: [],
        activeThreadId: null,
        threadError: null,
        threadHasMore: true
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
        ),
        threadMessages: state.threadMessages.map(msg =>
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
        ),
        threadMessages: state.threadMessages.map(msg =>
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

    case MESSAGE_ACTIONS.UPDATE_THREAD_MESSAGE:
      return {
        ...state,
        threadMessages: state.threadMessages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        )
      };

    case MESSAGE_ACTIONS.SET_THREAD_LOADING:
      return {
        ...state,
        threadLoading: action.payload
      };

    case MESSAGE_ACTIONS.SET_THREAD_ERROR:
      return {
        ...state,
        threadError: action.payload,
        threadLoading: false,
        threadLoadingMore: false
      };

    case MESSAGE_ACTIONS.ADD_OLDER_THREAD_MESSAGES:
      return {
        ...state,
        threadMessages: mergeMessages(state.threadMessages, action.payload.messages, true),
        threadHasMore: action.payload.hasMore,
        threadLoadingMore: false
      };

    case MESSAGE_ACTIONS.SET_THREAD_HAS_MORE:
      return {
        ...state,
        threadHasMore: action.payload
      };

      case MESSAGE_ACTIONS.UPDATE_MESSAGE_REACTIONS:
        return {
          ...state,
          messages: state.messages.map(msg => 
            msg.id === action.payload.id 
              ? { ...msg, reactions: action.payload.reactions } 
              : msg
          ),
          threadMessages: state.threadMessages.map(msg =>
            msg.id === action.payload.id 
              ? { ...msg, reactions: action.payload.reactions } 
              : msg
          )
        };
     

    case MESSAGE_ACTIONS.SET_THREAD_SUBSCRIPTION:
      return {
        ...state,
        threadSubscription: action.payload
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

// Provider component
export const MessageProvider = ({ children }) => {
  const { user } = useAuth();  // Add this line
  const [state, dispatch] = useReducer(messageReducer, initialState);
  
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
    if (state.typingSubscription) {
      state.typingSubscription();
      dispatch({ type: MESSAGE_ACTIONS.SET_TYPING_SUBSCRIPTION, payload: null });
    }
    
    const unsubscribe = MessageService.subscribeToTypingStatus(params, handleTypingUpdate);
    dispatch({ type: MESSAGE_ACTIONS.SET_TYPING_SUBSCRIPTION, payload: unsubscribe });
    
    return unsubscribe;
  }, [handleTypingUpdate, state.typingSubscription]);
  
  const setTypingStatus = useCallback(async (params, isTyping = true) => {
    if (!user?.uid) return;
    
    try {
      await MessageService.setTypingStatus(params, user.uid, isTyping);
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [user?.uid]);

  useEffect(() => {
    return () => {
      if (state.typingSubscription) {
        state.typingSubscription();
      }
    };
  }, [state.typingSubscription]);  

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
  }, []);


  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      const result = await MessageService.addReaction(
        messageId, 
        user.uid, 
        emoji,
        user.displayName || 'Unknown User'
      );
      
      dispatch({
        type: MESSAGE_ACTIONS.UPDATE_MESSAGE_REACTIONS,
        payload: result
      });
      
      return result;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, [user]);

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
  }, [user?.uid]);
  
  const clearSearch = useCallback(() => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_SEARCH });
  }, []);

  const handleThreadMessagesUpdate = useCallback(({ messages, error, threadId }) => {
    if (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_ERROR, payload: error });
    } else {
      dispatch({
        type: MESSAGE_ACTIONS.SET_THREAD_MESSAGES,
        payload: { messages, threadId }
      });
    }
  }, []);

  const subscribeToMessages = useCallback((params) => {
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGES });
    dispatch({ type: MESSAGE_ACTIONS.SET_LOADING, payload: true });
    
    return MessageService.subscribeToMessages(params, handleMessagesUpdate);
  }, [handleMessagesUpdate]);

  const subscribeToThread = useCallback((threadId) => {
    if (state.threadSubscription) {
      state.threadSubscription();
      dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_SUBSCRIPTION, payload: null });
    }
  
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_THREAD });
    dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_LOADING, payload: true });
    
    const unsubscribe = MessageService.subscribeToThread(threadId, handleThreadMessagesUpdate);
    dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_SUBSCRIPTION, payload: unsubscribe });
    
    return unsubscribe;
  }, [handleThreadMessagesUpdate, state]);

  const loadMoreMessages = useCallback(async (params) => {
    const messages = state.messages;
    const hasMore = state.hasMore;
    const loadingMore = state.loadingMore;
    
    if (!hasMore || loadingMore) return;

    try {
      dispatch({ type: MESSAGE_ACTIONS.SET_LOADING_MORE, payload: true });
      
      const oldestMessage = messages[0];
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
}, [state.messages, state.hasMore, state.loadingMore]);

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
}, []);

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
  }, []);

  const markAsRead = useCallback(async (messageId, userId) => {
    const messages = state.messages;
    try {
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      const message = messages[messageIndex];
      
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
}, [state.messages]);

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
  }, []);

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
  }, [deleteMessage]);

  const deleteChat = useCallback(async (chatId, userId) => {
    try {
      await MessageService.deleteChat(chatId, userId);
      dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGES });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const getBuddies = useCallback(async (userId) => {
    try {
      const buddies = await MessageService.getBuddies(userId);
      dispatch({ type: MESSAGE_ACTIONS.SET_BUDDIES, payload: buddies });
      return buddies;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const checkBuddyStatus = useCallback(async (userId1, userId2) => {
    try {
      return await MessageService.checkBuddyStatus(userId1, userId2);
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const getOrCreateBuddyChat = useCallback(async (userId1, userId2) => {
    try {
      return await MessageService.getOrCreateBuddyChat(userId1, userId2);
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  const sendReply = useCallback(async (messageData, parentMessageId) => {
    try {
      const reply = await MessageService.sendReply(messageData, parentMessageId);
      dispatch({
        type: MESSAGE_ACTIONS.ADD_REPLY,
        payload: reply
      });
      return reply;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);
  
  const loadThreadMessages = useCallback((threadId) => {
    return subscribeToThread(threadId);
  }, [subscribeToThread]);

  const loadMoreThreadMessages = useCallback(async (threadId) => {
    const threadMessages = state.threadMessages;
    const threadHasMore = state.threadHasMore;
    const threadLoadingMore = state.threadLoadingMore;
    
    if (!threadHasMore || threadLoadingMore) return;

    try {
      dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_LOADING, payload: true });
      
      const oldestThreadMessage = threadMessages[0];
      const result = await MessageService.fetchOlderThreadMessages(threadId, oldestThreadMessage);
      
      dispatch({
        type: MESSAGE_ACTIONS.ADD_OLDER_THREAD_MESSAGES,
        payload: {
          messages: result.messages,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_ERROR, payload: error.message });
    }
}, [state.threadMessages, state.threadHasMore, state.threadLoadingMore]);
  
const clearActiveThread = useCallback(() => {
  if (state.threadSubscription) {
    state.threadSubscription();
    dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_SUBSCRIPTION, payload: null });
  }
  dispatch({ type: MESSAGE_ACTIONS.CLEAR_THREAD });
}, [state, dispatch]);

  const updateThreadMessage = useCallback(async (messageId, updates) => {
    try {
      const updatedMessage = await MessageService.updateMessage(messageId, updates);
      dispatch({
        type: MESSAGE_ACTIONS.UPDATE_THREAD_MESSAGE,
        payload: updatedMessage
      });
      return updatedMessage;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_THREAD_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Cleanup thread subscription on unmount
  useEffect(() => {
    const { threadSubscription } = state;
    return () => {
      if (threadSubscription) {
        threadSubscription();
      }
    };
  }, [state]);

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
    sendReply,
    loadThreadMessages,
    clearActiveThread,
    loadMoreThreadMessages,
    updateThreadMessage,
    subscribeToThread,
    threadError: state.threadError,
    threadLoading: state.threadLoading,
    threadHasMore: state.threadHasMore,
    threadLoadingMore: state.threadLoadingMore,
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
    getCommonEmojis: MessageService.getCommonEmojis,
    getSortedReactions: MessageService.getSortedReactions,
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