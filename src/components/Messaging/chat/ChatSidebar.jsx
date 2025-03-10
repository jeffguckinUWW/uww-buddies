import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { MessageSquarePlus } from 'lucide-react';
import NotificationService from '../../../services/NotificationService';

// Simple NotificationBadge component
const NotificationBadge = ({ count }) => {
  if (!count || count <= 0) return null;
  
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const ChatSidebar = ({ selectedChatId, onChatSelect, onNewChat }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatNotifications, setChatNotifications] = useState({});

  // Subscribe to chat list
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'chats'),
      where('activeParticipants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const chatList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChats(chatList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching chats:', err);
        setError('Failed to load chats');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Subscribe to notifications for each chat
  useEffect(() => {
    if (!user?.uid || chats.length === 0) return;
    
    // Array to collect unsubscribe functions
    const unsubscribers = [];
    
    // Subscribe to notifications for each chat
    chats.forEach(chat => {
      const unsubscribe = NotificationService.subscribeToItemNotifications(
        user.uid,
        'chat',
        chat.id,
        (data) => {
          setChatNotifications(prev => ({
            ...prev,
            [chat.id]: data.totalCount || 0
          }));
        }
      );
      
      unsubscribers.push(unsubscribe);
    });
    
    // Cleanup function to unsubscribe from all notifications
    return () => {
      unsubscribers.forEach(unsub => {
        if (typeof unsub === 'function') {
          unsub();
        }
      });
    };
  }, [user, chats]);

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    const isCurrentUser = chat.lastMessage.senderId === user?.uid;
    return `${isCurrentUser ? 'You' : chat.lastMessage.senderName}: ${chat.lastMessage.text}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const oneDay = 24 * 60 * 60 * 1000;

    if (diff < oneDay) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * oneDay) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name;
    
    const otherParticipantId = chat.activeParticipants.find(id => id !== user?.uid);
    if (chat.names && otherParticipantId) {
      return chat.names[otherParticipantId] || 'Unknown User';
    }
    
    // Fallback to participants if names isn't available
    const otherParticipant = Object.entries(chat.participants)
      .find(([id]) => id !== user?.uid)?.[1];
      
    return otherParticipant?.displayName || 'Unknown User';
  };

  const handleChatSelection = (chatId) => {
    // Call the parent's onChatSelect handler
    onChatSelect(chatId);
  };

  return (
    <>
      <div className="p-4 border-b">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <MessageSquarePlus size={20} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">{error}</div>
        ) : chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No chats yet
          </div>
        ) : (
          chats.map(chat => {
            const notificationCount = chatNotifications[chat.id] || 0;
            
            return (
              <button
                key={chat.id}
                onClick={() => handleChatSelection(chat.id)}
                className={`w-full text-left p-4 hover:bg-gray-100 transition-colors
                  ${selectedChatId === chat.id ? 'bg-gray-100' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium truncate">
                    {getChatName(chat)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {/* Show notification badge if there are unread messages */}
                    {notificationCount > 0 && (
                      <NotificationBadge count={notificationCount} />
                    )}
                    {chat.lastMessageAt && (
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {formatLastMessage(chat)}
                </p>
              </button>
            );
          })
        )}
      </div>
    </>
  );
};

export default ChatSidebar;