import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import MessageList from '../shared/MessageList';
import MessageInput from '../shared/MessageInput';
import { MessageTypes } from '../../../services/MessageService';
import ChatSidebar from './ChatSidebar';
import ChatHeader from './ChatHeader';
import NewChatModal from './NewChatModal';
import { ArrowLeft } from 'lucide-react';
import FilePreview from '../shared/FilePreview';

const ChatContainer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedChat, setSelectedChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [sendingStatus, setSendingStatus] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [activeThread, setActiveThread] = useState(null);
  const [parentMessage, setParentMessage] = useState(null);
  const messagesContainerRef = useRef(null);
  
  const { 
    messages, 
    loading, 
    error,
    threadMessages, 
    threadLoading, 
    subscribeToMessages, 
    sendMessage,
    sendMessageWithFile,
    sendReply,
    deleteMessage,
    deleteChat,
    setTypingStatus,
    loadThreadMessages, 
    clearActiveThread 
  } = useMessages();

  // Handle navigation from notifications or buddy profiles
  useEffect(() => {
    if (location.state?.chatId) {
      setSelectedChat(location.state.chatId);
    }
  }, [location.state]);

  // Subscribe to messages for selected chat
  useEffect(() => {
    if (!selectedChat || !user?.uid) return;

    const unsubscribe = subscribeToMessages({
      type: 'chat',
      chatId: selectedChat
    });

    return () => unsubscribe();
  }, [selectedChat, user, subscribeToMessages]);

  // Clean up thread subscription when component unmounts
  useEffect(() => {
    return () => {
      if (activeThread) {
        clearActiveThread();
      }
    };
  }, [activeThread, clearActiveThread]);

  // Debug: Log thread messages whenever they change
  useEffect(() => {
    if (activeThread) {
      console.log("Current thread messages:", threadMessages);
    }
  }, [threadMessages, activeThread]);

  const handleSendMessage = async (text, file) => {
    if ((!text.trim() && !file) || !user || !selectedChat) return;

    try {
      setSendingStatus(true);
      setSendError(null);
      console.log('ChatContainer - Preparing message data', { hasText: !!text.trim(), hasFile: !!file });
      
      // First fetch the profile to get the correct name
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      let senderName = 'Unknown User';
      
      if (profileDoc.exists() && profileDoc.data().name) {
        senderName = profileDoc.data().name;
      } else if (user.displayName) {
        senderName = user.displayName;
      }

      const messageData = {
        chatId: selectedChat,
        senderId: user.uid,
        senderName: senderName,
        text: text.trim() || '',  // Ensure text is never undefined
        type: MessageTypes.CHAT,
        readBy: [user.uid]
      };

      console.log('ChatContainer - Message data prepared:', messageData);
      
      // If in thread view, send reply instead of regular message
      if (activeThread) {
        console.log("Sending reply to thread:", activeThread);
        await sendReply(messageData, activeThread);
      } else {
        // Regular message
        if (file) {
          await sendMessageWithFile(messageData, file);
        } else {
          await sendMessage(messageData);
        }
      }
      
      console.log('ChatContainer - Message sent successfully');
    } catch (err) {
      console.error('ChatContainer - Error in handleSendMessage:', err);
      setSendError(err);
    } finally {
      setSendingStatus(false);
    }
  };

  const handleReplyMessage = async (parentMessageId, text) => {
    if (!text.trim() || !user || !selectedChat || !parentMessageId) return;
    
    try {
      setSendingStatus(true);
      setSendError(null);
      
      // Fetch profile for sender name
      const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
      let senderName = 'Unknown User';
      
      if (profileDoc.exists() && profileDoc.data().name) {
        senderName = profileDoc.data().name;
      } else if (user.displayName) {
        senderName = user.displayName;
      }
      
      const messageData = {
        chatId: selectedChat,
        senderId: user.uid,
        senderName: senderName,
        text: text.trim(),
        type: MessageTypes.CHAT,
        readBy: [user.uid]
      };
      
      console.log("Sending reply to message:", parentMessageId);
      await sendReply(messageData, parentMessageId);
      console.log('Reply sent successfully');
    } catch (err) {
      console.error('Error sending reply:', err);
      setSendError(err);
    } finally {
      setSendingStatus(false);
    }
  };

  const handleViewThread = (messageId) => {
    console.log("Opening thread for message:", messageId);
    
    // Find the parent message in the current messages
    const parent = messages.find(m => m.id === messageId);
    if (parent) {
      setParentMessage(parent);
      console.log("Parent message:", parent);
    }
    
    // Set active thread and subscribe to thread messages
    setActiveThread(messageId);
    loadThreadMessages(messageId);
  };

  const handleCloseThread = () => {
    console.log("Closing thread view");
    clearActiveThread();
    setActiveThread(null);
    setParentMessage(null);
  };

  const handleEditMessage = async (messageId, newText) => {
    // Implement if needed
    console.log("Edit message not implemented yet");
  };

  const handleTypingStatus = (params, isTyping) => {
    if (user && selectedChat && setTypingStatus) {
      setTypingStatus(params, user.uid, isTyping);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId, user.uid);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleDeleteChat = async () => {
    try {
      await deleteChat(selectedChat, user.uid);
      setSelectedChat(null);
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-white rounded-lg shadow-md overflow-hidden">
      <div className="w-1/3 border-r flex flex-col bg-gray-50">
        <ChatSidebar
          selectedChatId={selectedChat}
          onChatSelect={setSelectedChat}
          onNewChat={() => setShowNewChatModal(true)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <>
            <ChatHeader 
              chatId={selectedChat}
              onDeleteChat={handleDeleteChat}
            />
            
            {activeThread ? (
              // Thread View
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Thread Header */}
                <div className="flex items-center gap-2 p-3 border-b bg-gray-50">
                  <button 
                    onClick={handleCloseThread}
                    className="p-1 rounded-full hover:bg-gray-200"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium">Thread</h3>
                    <p className="text-xs text-gray-500">
                      {parentMessage?.replyCount || 0} {parentMessage?.replyCount === 1 ? 'reply' : 'replies'} 
                    </p>
                  </div>
                </div>
                
                {/* Thread Messages */}
                <div className="flex-1 overflow-y-auto">
                  {threadLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {/* Parent Message */}
                      {parentMessage && (
                        <div className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                          <div className="text-sm font-medium mb-1">
                            {parentMessage.senderName} <span className="text-xs font-normal text-gray-500">- Original Message</span>
                          </div>
                          <div className="text-sm">{parentMessage.text}</div>
                          {parentMessage.fileAttachment && (
                            <div className="mt-2 max-w-full overflow-hidden">
                              <FilePreview fileAttachment={parentMessage.fileAttachment} />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Direct Thread Messages Rendering for Debugging */}
                      <div className="space-y-4">
                        {threadMessages.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            No replies yet. Be the first to reply!
                          </div>
                        ) : (
                          threadMessages.map(message => (
                            <div 
                              key={message.id} 
                              className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`relative max-w-[80%] rounded-lg p-3 ${
                                message.senderId === user?.uid 
                                  ? 'bg-[#4460F1] text-white' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {message.senderId !== user?.uid && (
                                  <div className="font-medium text-sm mb-1">
                                    {message.senderName}
                                  </div>
                                )}
                                <div>{message.text}</div>
                                {message.fileAttachment && (
                                  <div className="mt-2">
                                    <FilePreview fileAttachment={message.fileAttachment} />
                                  </div>
                                )}
                                <div className="text-xs mt-1 text-right">
                                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Thread Reply Input */}
                <div className="p-4 border-t sticky bottom-0 bg-white">
                  <MessageInput 
                    onSend={handleSendMessage}
                    disabled={loading || threadLoading}
                    placeholder="Reply to thread..."
                    isSending={sendingStatus}
                    sendError={sendError}
                  />
                </div>
              </div>
            ) : (
              // Normal Message View
              <div className="flex-1 overflow-hidden" ref={messagesContainerRef}>
                <MessageList
                  messages={messages}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReplyMessage={handleReplyMessage}
                  onViewThread={handleViewThread}
                  loading={loading}
                  error={error}
                  activeThreadId={activeThread}
                />
              </div>
            )}

            {/* Input area (only shown when not in thread view) */}
            {!activeThread && (
              <div className="p-4 border-t mt-auto sticky bottom-0 bg-white">
                <MessageInput 
                  onSend={handleSendMessage}
                  disabled={loading}
                  placeholder="Type a message..."
                  isSending={sendingStatus}
                  sendError={sendError}
                  typingParams={selectedChat ? { type: 'chat', chatId: selectedChat } : null}
                  onTypingStatus={handleTypingStatus}
                />
              </div>
            )}
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

      {showNewChatModal && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={(chatId) => {
            setSelectedChat(chatId);
            setShowNewChatModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ChatContainer;