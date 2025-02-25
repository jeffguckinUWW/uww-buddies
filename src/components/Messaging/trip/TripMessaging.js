// src/components/Messaging/trip/TripMessaging.js

import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, User, Search, Megaphone } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import ThreadView from '../shared/ThreadView';
import { Card } from '../../ui/card';
import EnhancedErrorAlert from '../../ui/EnhancedErrorAlert';
import SearchBar from '../shared/SearchBar';
import SearchResults from '../shared/SearchResults';
import TypingIndicator from '../shared/TypingIndicator';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const TripMessaging = ({ trip, isOpen, onClose }) => {
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    loadingMore,
    error, 
    hasMore,
    isSearching,
    subscribeToMessages, 
    loadMoreMessages,
    sendMessage,
    sendMessageWithFile,
    deleteMessage,
    deleteMessageWithFile,
    editMessage,
    addReaction,
    // Add these for typing indicators
    subscribeToTypingStatus,
    setTypingStatus,
    typingUsers
  } = useMessages();
  
  const [activeTab, setActiveTab] = useState('discussion');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThread, setActiveThread] = useState(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const isInstructor = trip?.instructorId === user?.uid;

  useEffect(() => {
    if (!typingUsers || typingUsers.length === 0) return;
    
    const fetchUserProfiles = async () => {
      const newProfiles = {...userProfiles};
      let hasNewProfiles = false;
      
      for (const userId of typingUsers) {
        if (!userProfiles[userId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              newProfiles[userId] = userDoc.data();
              hasNewProfiles = true;
            }
          } catch (error) {
            console.error(`Error fetching user profile for ${userId}:`, error);
          }
        }
      }
      
      if (hasNewProfiles) {
        setUserProfiles(newProfiles);
      }
    };
    
    fetchUserProfiles();
  }, [typingUsers, userProfiles]);
  
  // Add effect to subscribe to typing status
  useEffect(() => {
    if (!trip?.id || !user?.uid) return;
    
    const typingParams = {
      type: 'trip',
      tripId: trip.id,
      messageType: activeTab === 'broadcast' 
        ? 'trip_broadcast' 
        : 'trip_discussion'
    };
    
    const unsubscribe = subscribeToTypingStatus(typingParams);
    
    return () => {
      unsubscribe();
      // Make sure to set typing status to false when unmounting
      setTypingStatus(typingParams, false);
    };
  }, [trip?.id, user?.uid, activeTab, subscribeToTypingStatus, setTypingStatus]);

  useEffect(() => {
    if (!trip?.id || !user?.uid) return;

    const unsubscribes = [];

    if (activeTab === 'broadcast' && isInstructor) {
      unsubscribes.push(
        subscribeToMessages({
          type: 'trip',
          tripId: trip.id,
          messageType: 'trip_broadcast'
        })
      );
    } else if (activeTab === 'discussion') {
      unsubscribes.push(
        subscribeToMessages({
          type: 'trip',
          tripId: trip.id,
          messageType: 'trip_discussion'
        })
      );
    } else if (activeTab === 'private') {
      unsubscribes.push(
        subscribeToMessages({
          type: 'trip',
          tripId: trip.id,
          messageType: 'trip_private'
        })
      );
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [trip?.id, user?.uid, subscribeToMessages, activeTab, isInstructor]);

  const handleLoadMore = useCallback(() => {
    const params = {
      type: 'trip',
      tripId: trip?.id,
      messageType: activeTab === 'broadcast' ? 'trip_broadcast' : 'trip_discussion'
    };
    loadMoreMessages(params);
  }, [loadMoreMessages, trip?.id, activeTab]);

  const handleReaction = useCallback(async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [addReaction]);

  const handleSendMessage = async (text, file, type = activeTab, recipientId = null) => {
    if ((!text.trim() && !file) || !user || !trip) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      let messageType;
      switch (type) {
        case 'broadcast':
          messageType = 'trip_broadcast';
          break;
        case 'private':
          messageType = 'trip_private';
          break;
        default:
          messageType = 'trip_discussion';
      }
  
      let readTracking = {};
      if (messageType === 'trip_broadcast') {
        const participants = trip.participants || [];
        readTracking = {
          readBy: [user.uid],
          readStatus: participants.reduce((acc, participant) => {
            acc[participant.uid] = {
              read: false,
              readAt: null,
              name: participant.displayName || 'Unknown User'
            };
            return acc;
          }, {}),
          totalRecipients: participants.length,
          readCount: 0
        };
      }
      
      const messageData = {
        tripId: trip.id,
        senderId: user.uid,
        senderName: user.displayName || 'Unknown User',
        text: text.trim(),
        timestamp: new Date(),
        type: messageType,
        ...(recipientId && { recipientId }),
        ...(messageType === 'trip_broadcast' && readTracking)
      };
      
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
  

  const handleDeleteMessage = async (messageId) => {
    try {
      const message = messages.find(msg => msg.id === messageId);
      
      if (message?.fileAttachment?.path) {
        await deleteMessageWithFile(messageId, user.uid, message.fileAttachment.path);
      } else {
        await deleteMessage(messageId, user.uid);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Optionally show an error toast or notification
    }
  };

  const handleEditMessage = async (messageId, newText) => {
    try {
      await editMessage(messageId, newText, user.uid);
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleReplyMessage = useCallback((message) => {
    setActiveThread(message);
    setShowThreadView(true);
  }, []);

  const closeThreadView = useCallback(() => {
    setShowThreadView(false);
    setActiveThread(null);
  }, []);

  const filteredMessages = messages.filter(msg => {
    switch (activeTab) {
      case 'broadcast':
        return msg.type === 'trip_broadcast';
      case 'discussion':
        return msg.type === 'trip_discussion';
      case 'private':
        return msg.type === 'trip_private' && 
          (msg.senderId === user?.uid || msg.recipientId === user?.uid ||
           (isInstructor && (msg.senderId === selectedParticipant || msg.recipientId === selectedParticipant)));
      default:
        return false;
    }
  });

  const filteredParticipants = trip?.participants?.filter(participant =>
    participant.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isOpen) return null;

  // Show ThreadView when a thread is active
  if (showThreadView && activeThread) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100">
        <div className="absolute inset-0 bg-black/30" onClick={closeThreadView} />
        <div className="relative flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-4xl h-[36rem] flex flex-col overflow-hidden bg-white shadow-lg">
            <ThreadView
              parentMessage={activeThread}
              currentUserId={user?.uid}
              onClose={closeThreadView}
              onDeleteMessage={handleDeleteMessage}
              onEditMessage={handleEditMessage}
              tripId={trip.id}
              isTripMessaging={true}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-100">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-4xl h-[36rem] flex flex-col overflow-hidden bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl text-gray-800">
              {trip?.location} - Trip Communications
            </h2>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {error && (
          <EnhancedErrorAlert 
            error={error} 
            className="mx-4 mt-4"
            onRetry={() => {
              if (trip?.id && user?.uid) {
                const params = {
                  type: 'trip',
                  tripId: trip.id,
                  messageType: activeTab === 'broadcast' 
                    ? 'trip_broadcast' 
                    : 'trip_discussion'
                };
                subscribeToMessages(params);
              }
            }}
          />
        )}

          {/* Tabs */}
          <div className="flex px-6 border-b">
            {isInstructor && (
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
              className={`px-5 py-3 ${!isInstructor ? '' : 'ml-6'} flex items-center gap-2 border-b-2 transition-colors
                ${activeTab === 'discussion' 
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare size={18} />
              <span>Trip Discussion</span>
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                ${activeTab === 'private' 
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <User size={18} />
              <span>{isInstructor ? 'Participant Messages' : 'Message Trip Leader'}</span>
            </button>
          </div>

          {/* Search Bar - New Addition */}
          {activeTab !== 'private' && (
            <div className="px-6 py-3 border-b">
              <SearchBar 
                params={{
                  type: 'trip',
                  tripId: trip.id,
                  messageType: activeTab === 'broadcast' 
                    ? 'trip_broadcast' 
                    : 'trip_discussion'
                }}
              />
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 flex flex-col min-h-0">
            {isSearching ? (
              <SearchResults
                currentUserId={user?.uid}
                onDeleteMessage={handleDeleteMessage}
                onEditMessage={handleEditMessage}
                onReplyMessage={handleReplyMessage}
                onViewThread={handleReplyMessage}
                isInstructor={isInstructor}
              />
            ) : activeTab === 'broadcast' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReplyMessage={handleReplyMessage}
                  onViewThread={handleReplyMessage}
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={true}
                  showThreadIndicator={true}
                  isInstructor={isInstructor}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                />
                
                {/* Add typing indicator */}
                <TypingIndicator 
                  typingUsers={typingUsers} 
                  userProfiles={userProfiles}
                  currentUserId={user?.uid}
                />
              </div>
                {isInstructor && (
                  <div className="flex-shrink-0">
                    <MessageInput
                      onSend={(text, file) => handleSendMessage(text, file, 'broadcast')}
                      placeholder="Send a broadcast message to all participants..."
                      isSending={isSending}
                      sendError={sendError}
                      typingParams={{
                        type: 'trip',
                        tripId: trip.id,
                        messageType: 'trip_broadcast'
                      }}
                      onTypingStatus={setTypingStatus}
                    />
                  </div>
                )}
              </div>
            ) : activeTab === 'discussion' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages}
                  currentUserId={user?.uid}
                  onDeleteMessage={handleDeleteMessage}
                  onEditMessage={handleEditMessage}
                  onReplyMessage={handleReplyMessage}
                  onViewThread={handleReplyMessage}
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={true}
                  showThreadIndicator={true}
                  isInstructor={isInstructor}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                />
                
                {/* Add typing indicator */}
                <TypingIndicator 
                  typingUsers={typingUsers} 
                  userProfiles={userProfiles}
                  currentUserId={user?.uid}
                />
              </div>
                <div className="flex-shrink-0">
                <MessageInput
                  onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                  placeholder={isInstructor ? "Start a discussion..." : "Type a message..."}
                  isSending={isSending}
                  sendError={sendError}
                  typingParams={{
                    type: 'trip',
                    tripId: trip.id,
                    messageType: 'trip_discussion'
                  }}
                  onTypingStatus={setTypingStatus}
                />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {isInstructor ? (
                  <>
                    {/* Participant list */}
                    <div className="w-80 flex-shrink-0 border-r flex flex-col">
                      <div className="p-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                          <Search className="text-gray-400" size={16} />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search participants..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {filteredParticipants.map(participant => (
                          <button
                            key={participant.uid}
                            onClick={() => setSelectedParticipant(participant.uid)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors
                              ${selectedParticipant === participant.uid ? 'bg-[#4460F1]/5 hover:bg-[#4460F1]/5' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-sm text-gray-600">
                                  {participant.displayName
                                    ?.split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || '??'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-gray-800 truncate">
                                  {participant.displayName}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {participant.email}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white">
                      {selectedParticipant ? (
                        <>
                          <div className="flex-1 overflow-y-auto">
                          <MessageList
                            messages={filteredMessages}
                            currentUserId={user?.uid}
                            onDeleteMessage={handleDeleteMessage}
                            onEditMessage={handleEditMessage}
                            onReplyMessage={handleReplyMessage}
                            onViewThread={handleReplyMessage}
                            onReactionSelect={handleReaction}
                            loading={loading}
                            loadingMore={loadingMore}
                            error={error}
                            showBroadcastIndicator={true}
                            showThreadIndicator={true}
                            isInstructor={isInstructor}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                          />
                          
                          {/* Add typing indicator */}
                          <TypingIndicator 
                            typingUsers={typingUsers} 
                            userProfiles={userProfiles}
                            currentUserId={user?.uid}
                          />
                        </div>
                          <div className="flex-shrink-0">
                          <MessageInput
                            onSend={(text, file) => handleSendMessage(text, file, 'private', selectedParticipant)}
                            placeholder="Message participant..."
                            isSending={isSending}
                            sendError={sendError}
                            typingParams={{
                              type: 'trip',
                              tripId: trip.id,
                              messageType: 'trip_private'
                            }}
                            onTypingStatus={setTypingStatus}
                          />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                          <div className="text-center">
                            <div className="text-3xl mb-3">👋</div>
                            <p>Select a participant to start messaging</p>
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
                      onReplyMessage={handleReplyMessage}
                      onViewThread={handleReplyMessage}
                      onReactionSelect={handleReaction}
                      loading={loading}
                      loadingMore={loadingMore}
                      error={error}
                      showBroadcastIndicator={true}
                      showThreadIndicator={true}
                      isInstructor={isInstructor}
                      hasMore={hasMore}
                      onLoadMore={handleLoadMore}
                    />
                    
                    {/* Add typing indicator */}
                    <TypingIndicator 
                      typingUsers={typingUsers} 
                      userProfiles={userProfiles}
                      currentUserId={user?.uid}
                    />
                  </div>
                  <MessageInput
                    onSend={(text, file) => handleSendMessage(text, file, 'private', selectedParticipant)}
                    placeholder="Message participant..."
                    isSending={isSending}
                    sendError={sendError}
                    typingParams={{
                      type: 'trip',
                      tripId: trip.id,
                      messageType: 'trip_private'
                    }}
                    onTypingStatus={setTypingStatus}
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

export default TripMessaging;