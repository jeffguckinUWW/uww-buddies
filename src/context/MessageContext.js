// src/context/MessageContext.js
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import MessageService from '../services/MessageService';
import { arrayUnion } from 'firebase/firestore';  // Add this import

const MessageContext = createContext();

// Action types
const MESSAGE_ACTIONS = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES'
};

// Initial state
const initialState = {
  messages: [],
  loading: false,
  error: null,
  currentChatId: null,
  currentCourseId: null
};

// Reducer
const messageReducer = (state, action) => {
  switch (action.type) {
    case MESSAGE_ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: action.payload,
        loading: false,
        error: null
      };
    case MESSAGE_ACTIONS.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case MESSAGE_ACTIONS.UPDATE_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? action.payload : msg
        )
      };
    case MESSAGE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case MESSAGE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case MESSAGE_ACTIONS.CLEAR_MESSAGES:
      return {
        ...state,
        messages: [],
        error: null
      };
    default:
      return state;
  }
};

// Provider component
export const MessageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(messageReducer, initialState);

  // Subscribe to messages
  const subscribeToMessages = useCallback((params) => {
    // Clear old messages when subscribing to a new chat
    dispatch({ type: MESSAGE_ACTIONS.CLEAR_MESSAGES });
    dispatch({ type: MESSAGE_ACTIONS.SET_LOADING, payload: true });
    
    return MessageService.subscribeToMessages(params, ({ messages, error }) => {
      if (error) {
        dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error });
      } else {
        dispatch({ type: MESSAGE_ACTIONS.SET_MESSAGES, payload: messages });
      }
    });
  }, []);

  // Send message
  const sendMessage = useCallback(async (messageData) => {
    try {
      const message = await MessageService.sendMessage(messageData);
      return message;
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (messageId, userId) => {
    try {
      await MessageService.markAsRead(messageId, userId);
      dispatch({
        type: MESSAGE_ACTIONS.UPDATE_MESSAGE,
        payload: {
          id: messageId,
          readBy: arrayUnion(userId)
        }
      });
    } catch (error) {
      dispatch({ type: MESSAGE_ACTIONS.SET_ERROR, payload: error.message });
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId, userId) => {
    try {
      await MessageService.deleteMessage(messageId, userId);
      // Update local state to hide message for this user
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

  const value = {
    ...state,
    subscribeToMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    dispatch
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