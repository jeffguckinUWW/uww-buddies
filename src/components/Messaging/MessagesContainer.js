// src/components/Messaging/MessagesContainer.js
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import MessageInput from './MessageInput';
import { NewChatModal } from './NewChatModal';
import { ChatPreview } from './ChatPreview';
import { ChatHeader } from './ChatHeader';

export const MessagesContainer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Handle navigation from notifications or buddy profiles
  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    }
  }, [location.state]);

  // Fetch user's chats using the activeParticipants field
  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'messages'),
        where('activeParticipants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const chatList = [];
        snapshot.forEach((doc) => {
          chatList.push({ id: doc.id, ...doc.data() });
        });
        setChats(chatList);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching chats:', error);
        setError('Failed to load chats');
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up chat listener:', err);
      setError('Failed to load chats');
      setLoading(false);
    }
  }, [user]);

  // Fetch messages for selected chat
  useEffect(() => {
    if (!selectedChat || !user) return;

    try {
      const q = query(
        collection(db, `messages/${selectedChat}/content`),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const messageList = [];
        snapshot.forEach((doc) => {
          const message = doc.data();
          if (!message.deletedFor?.includes(user.uid)) {
            messageList.push({ id: doc.id, ...message });
          }
        });
        setMessages(messageList);
      }, (error) => {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up message listener:', err);
      setError('Failed to load messages');
    }
  }, [selectedChat, user]);

  const deleteChat = async (chatId) => {
    if (!user) return;
    
    try {
      setLoading(true);
      const chatRef = doc(db, 'messages', chatId);
      const batch = writeBatch(db);
  
      // Mark all messages as deleted for this user
      const messagesSnapshot = await getDocs(collection(db, `messages/${chatId}/content`));
      messagesSnapshot.docs.forEach(messageDoc => {
        const messageRef = doc(db, `messages/${chatId}/content`, messageDoc.id);
        batch.update(messageRef, {
          deletedFor: arrayUnion(user.uid)
        });
      });
  
      // Update chat document
      batch.update(chatRef, {
        [`participants.${user.uid}.active`]: false,
        activeParticipants: arrayRemove(user.uid)
      });
  
      await batch.commit();
      setSelectedChat(null);  // Clear selected chat first
      setMessages([]); // Clear messages
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError('Failed to delete chat');
    } finally {
      setLoading(false);
    }
  };

  // Start new chat (from modal)
  const startNewChat = async (participants, isGroup = false) => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');

      // Create array of active participants including current user
      const activeParticipants = [user.uid, ...participants];
      
      const chatRef = await addDoc(collection(db, 'messages'), {
        type: isGroup ? 'group' : 'direct',
        participants: {
          [user.uid]: { joined: serverTimestamp(), active: true },
          ...participants.reduce((acc, id) => ({
            ...acc,
            [id]: { joined: serverTimestamp(), active: true }
          }), {})
        },
        activeParticipants,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp()
      });

      // Create notifications for all participants
      await Promise.all(participants.map(participantId => 
        addDoc(collection(db, 'notifications'), {
          type: 'new_message',
          fromUser: user.uid,
          fromUserName: user.displayName,
          toUser: participantId,
          messageId: chatRef.id,
          messagePreview: 'Started a new chat',
          chatType: isGroup ? 'group' : 'direct',
          timestamp: serverTimestamp(),
          read: false
        })
      ));

      setSelectedChat(chatRef.id);
      setShowNewChatModal(false);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async (chatId, text) => {
    if (!user) return;
    
    try {
      const messageRef = await addDoc(collection(db, `messages/${chatId}/content`), {
        senderId: user.uid,
        text,
        timestamp: serverTimestamp(),
        deletedFor: []
      });

      // Update chat's updatedAt timestamp
      await updateDoc(doc(db, 'messages', chatId), {
        updatedAt: serverTimestamp()
      });

      // Notify other participants
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        const otherParticipants = chat.activeParticipants.filter(id => id !== user.uid);

        await Promise.all(otherParticipants.map(participantId =>
          addDoc(collection(db, 'notifications'), {
            type: 'new_message',
            fromUser: user.uid,
            fromUserName: user.displayName,
            toUser: participantId,
            messageId: chatId,
            messagePreview: text.length > 50 ? `${text.substring(0, 50)}...` : text,
            chatType: chat.type,
            chatName: chat.type === 'group' ? chat.name : null,
            timestamp: serverTimestamp(),
            read: false
          })
        ));
      }

      return messageRef;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
      throw err;
    }
  };

  // Delete message (for current user only)
  const deleteMessage = async (chatId, messageId) => {
    if (!user) return;
    
    try {
      const messageRef = doc(db, `messages/${chatId}/content`, messageId);
      await updateDoc(messageRef, {
        deletedFor: arrayUnion(user.uid)
      });
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  };

  // Leave group chat
  const leaveChat = async (chatId) => {
    if (!user) return;
    
    try {
      const chatRef = doc(db, 'messages', chatId);
      await updateDoc(chatRef, {
        [`participants.${user.uid}.active`]: false,
        activeParticipants: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });
      setSelectedChat(null);
    } catch (err) {
      console.error('Error leaving chat:', err);
      setError('Failed to leave chat');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-lg shadow-md overflow-hidden">
      {/* Left Sidebar - Chat List */}
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <div className="p-4 border-b">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300 hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            New Message
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No chats yet</div>
          ) : (
            chats.map(chat => (
              <ChatPreview
                key={chat.id}
                chat={chat}
                isSelected={selectedChat === chat.id}
                onClick={() => setSelectedChat(chat.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Window */}
      <div className="flex-1 flex flex-col bg-white">
        {error && (
          <div className="bg-red-100 text-red-700 p-2 text-center text-sm">
            {error}
          </div>
        )}

        {selectedChat ? (
          <>
            <ChatHeader 
              chat={chats.find(c => c.id === selectedChat)} 
              onLeaveChat={() => leaveChat(selectedChat)}
              onDeleteChat={() => deleteChat(selectedChat)}
            />
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[70%] group">
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        message.senderId === user?.uid
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      {message.text}
                    </div>
                    {message.senderId === user?.uid && (
                      <button
                        onClick={() => deleteMessage(selectedChat, message.id)}
                        className="text-xs text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t bg-white">
              <MessageInput 
                onSend={(text) => sendMessage(selectedChat, text)} 
                disabled={loading} 
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="mb-2">Select a chat or start a new conversation</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="text-blue-500 hover:underline"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onCreateChat={startNewChat}
      />
    </div>
  );
};