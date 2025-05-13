// src/pages/ChatPage.js - Updated
import React, { useState, useEffect } from 'react';
import { MessageProvider } from '../context/MessageContext';
import ChatContainer from '../components/Messaging/chat/ChatContainer';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/NotificationService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const ChatPage = () => {
  const { user } = useAuth();
  const [chatNotifications, setChatNotifications] = useState({});
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    
    // Check immediately
    checkScreenSize();
    
    // Add listener for window resize
    window.addEventListener('resize', checkScreenSize);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Subscribe to chat notifications
  useEffect(() => {
    if (!user) return;

    // Updated query to match security rules - using activeParticipants instead of participants
    const chatQuery = query(
      collection(db, 'chats'),
      where('activeParticipants', 'array-contains', user.uid)
    );

    getDocs(chatQuery).then(snapshot => {
      const chatIds = snapshot.docs.map(doc => doc.id);
      
      // Subscribe to notifications for each chat
      const unsubscribers = chatIds.map(chatId => {
        return NotificationService.subscribeToItemNotifications(
          user.uid,
          'chat',
          chatId,
          (data) => {
            setChatNotifications(prev => ({
              ...prev,
              [chatId]: data.totalCount
            }));
          }
        );
      });
      
      return () => {
        unsubscribers.forEach(unsub => unsub && unsub());
      };
    }).catch(error => {
      console.error("Error fetching chats:", error);
      
      // Initialize empty notifications to prevent further errors
      setChatNotifications({});
    });
  }, [user]);

  return (
    <MessageProvider>
      {/* Using full height and width of available space */}
      <div className="h-full w-full chat-container smooth-scroll no-overscroll">
        <ChatContainer 
          chatNotifications={chatNotifications} 
          isSmallScreen={isSmallScreen}
        />
      </div>
    </MessageProvider>
  );
};

export default ChatPage;