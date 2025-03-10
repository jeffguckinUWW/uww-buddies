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
      
      // Provide more specific error messages based on error type
      if (error.code === 'permission-denied') {
        console.error("Permission denied: Check that you have access to these chats");
        // You could set an error state here to display to the user
      } else if (error.code === 'unavailable') {
        console.error("Firebase is temporarily unavailable. Please try again later.");
        // You could set a connectivity error state here
      }
      
      // Initialize empty notifications to prevent further errors
      setChatNotifications({});
    });
  }, [user]);

  return (
    <MessageProvider>
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <ChatContainer chatNotifications={chatNotifications} />
        </div>
      </div>
    </MessageProvider>
  );
};

export default ChatPage;