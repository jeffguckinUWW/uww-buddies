// src/components/Messaging/trip/TripMessaging.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, MessageSquare, User, Search, Megaphone } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import { Card } from '../../ui/card';
import EnhancedErrorAlert from '../../ui/EnhancedErrorAlert';
import SearchBar from '../shared/SearchBar';
import SearchResults from '../shared/SearchResults';
import TypingIndicator from '../shared/TypingIndicator';
import { db } from '../../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const TripMessaging = ({ 
  trip, 
  isOpen, 
  onClose, 
  defaultView = 'discussion' // Always default to discussion view
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
    loadMoreMessages,
    sendMessage,
    sendMessageWithFile,
    deleteMessage,
    deleteMessageWithFile,
    editMessage,
    addReaction,
    subscribeToTypingStatus,
    setTypingStatus,
    typingUsers
  } = useMessages();
  
  const [activeTab, setActiveTab] = useState(defaultView);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState({});
  const isInstructor = trip?.instructorId === user?.uid;
  
  // Refs to track subscriptions and avoid dependency cycles
  const subscriptionsRef = useRef([]);
  const isComponentMounted = useRef(true);

  // Setup component lifecycle
  useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      
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

  // UPDATED: Now uses getUserData helper function
  useEffect(() => {
    if (!typingUsers || typingUsers.length === 0) return;
    
    const fetchUserProfiles = async () => {
      const newProfiles = {...userProfiles};
      let hasNewProfiles = false;
      
      for (const userId of typingUsers) {
        if (!userProfiles[userId]) {
          try {
            // Use transition helper to get user data from either collection
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
  }, [typingUsers]); // Intentionally excluded userProfiles to prevent infinite loop
  
  // Subscribe to typing status
  useEffect(() => {
    if (!trip?.id || !user?.uid) return;
    
    const typingParams = {
      type: 'trip',
      tripId: trip.id,
      messageType: activeTab === 'broadcast' 
        ? 'trip_broadcast' 
        : 'trip_discussion'
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
    }, 50);
    
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
  }, [trip?.id, user?.uid, activeTab, subscribeToTypingStatus, setTypingStatus]);

  // Subscribe to messages based on active tab
  useEffect(() => {
    if (!trip?.id || !user?.uid) return;
  
    const unsubscribes = [];
    const timeoutIds = [];
    
    if (activeTab === 'broadcast') {
      // Only subscribe to broadcasts when in broadcast tab
      console.log('Subscribing to trip broadcasts');
      const timeoutId = setTimeout(() => {
        if (isComponentMounted.current) {
          const unsub = subscribeToMessages({
            type: 'trip',
            tripId: trip.id,
            messageType: 'trip_broadcast',
            currentUserId: user.uid
          });
          if (unsub) {
            unsubscribes.push(unsub);
            subscriptionsRef.current.push(unsub);
          }
        }
      }, 100);
      timeoutIds.push(timeoutId);
    }
    else if (activeTab === 'discussion') {
      // Only subscribe to discussions when in discussion tab
      console.log('Subscribing to trip discussions');
      const timeoutId = setTimeout(() => {
        if (isComponentMounted.current) {
          const unsub = subscribeToMessages({
            type: 'trip',
            tripId: trip.id,
            messageType: 'trip_discussion',
            currentUserId: user.uid
          });
          if (unsub) {
            unsubscribes.push(unsub);
            subscriptionsRef.current.push(unsub);
          }
        }
      }, 100);
      timeoutIds.push(timeoutId);
    }
    else if (activeTab === 'private') {
      // Only subscribe to private messages when in private tab
      console.log('Subscribing to private messages');
      const timeoutId = setTimeout(() => {
        if (isComponentMounted.current) {
          // Create the base subscription params
          const subscriptionParams = {
            type: 'trip',
            tripId: trip.id,
            messageType: 'trip_private',
            currentUserId: user.uid
          };
          
          // If instructor has selected a specific participant
          if (isInstructor && selectedParticipant) {
            subscriptionParams.recipientId = selectedParticipant;
          }
          
          console.log('Subscribing with private params:', subscriptionParams);
          
          const unsub = subscribeToMessages(subscriptionParams);
          if (unsub) {
            unsubscribes.push(unsub);
            subscriptionsRef.current.push(unsub);
          }
        }
      }, 100);
      timeoutIds.push(timeoutId);
    }
  
    return () => {
      // Clear all timeouts
      timeoutIds.forEach(id => clearTimeout(id));
      
      // Unsubscribe from all subscriptions created in this effect
      unsubscribes.forEach(unsub => {
        if (typeof unsub === 'function') {
          try {
            unsub();
            subscriptionsRef.current = subscriptionsRef.current.filter(sub => sub !== unsub);
          } catch (e) {
            console.error('Error unsubscribing from messages:', e);
          }
        }
      });
    };
  }, [trip?.id, user?.uid, subscribeToMessages, activeTab, isInstructor, selectedParticipant]);

  const handleLoadMore = useCallback(() => {
    const params = {
      type: 'trip',
      tripId: trip?.id,
      messageType: activeTab === 'broadcast' ? 'trip_broadcast' : 'trip_discussion',
      currentUserId: user?.uid
    };
    loadMoreMessages(params);
  }, [loadMoreMessages, trip?.id, activeTab, user?.uid]);

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
    
      // Get all participants UIDs
      const participants = trip.participants || [];
      const participantUids = participants.map(p => p.uid);
      
      // Create the allowedReaders array for ALL message types
      const allowedReaders = [
        user.uid,            // The sender can read it
        trip.instructorId,   // The instructor can read it
        ...participantUids   // All participants can read it
      ];
      
      // Remove any duplicates
      const uniqueAllowedReaders = [...new Set(allowedReaders)];
      
      let readTracking = {};
      if (messageType === 'trip_broadcast') {
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
      
      // Add role designation for broadcast messages with better name retrieval
      // Get user name with proper fallbacks, checking all possible sources
      let senderDisplayName = user.name || user.displayName || user.email || 'Unknown User';
      if (type === 'broadcast' && isInstructor) {
        senderDisplayName += ' (Trip Leader)';
      }
      
      const messageData = {
        tripId: trip.id,
        senderId: user.uid,
        senderName: senderDisplayName,
        text: text.trim(),
        timestamp: new Date(),
        type: messageType,
        // Add explicit flags for better message handling
        isBroadcast: messageType === 'trip_broadcast', 
        isTripMessaging: true,
        courseId: null,
        isInstructor: isInstructor,
        // ALWAYS include allowedReaders for ALL message types
        allowedReaders: uniqueAllowedReaders,
        ...(recipientId && { recipientId }),
        ...(messageType === 'trip_broadcast' && readTracking)
      };
      
      // ADD THIS DEBUGGING CODE RIGHT HERE
      console.log('About to send trip message:', {
        tripId: trip.id,
        messageType: messageType,
        type: messageType,
        allowedReaders: uniqueAllowedReaders?.length,
        recipientId: recipientId
      });
      
      console.log('Sending message with data:', messageData);
      
      if (file) {
        await sendMessageWithFile(messageData, file);
      } else {
        await sendMessage(messageData);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      if (typeof error === 'object' && error !== null) {
        setSendError({ message: error.message || 'Unknown error' });
      } else {
        setSendError({ message: String(error) });
      }
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

  const filteredMessages = messages.filter(msg => {
    switch (activeTab) {
      case 'broadcast':
        // Only show broadcasts in broadcast tab
        return msg.type === 'trip_broadcast';
        
      case 'discussion':
        // ONLY discussion messages, not broadcasts
        return msg.type === 'trip_discussion';
        
      case 'private':
        // Private messaging logic
        if (isInstructor && selectedParticipant) {
          return msg.type === 'trip_private' && 
            ((msg.senderId === user?.uid && msg.recipientId === selectedParticipant) ||
             (msg.senderId === selectedParticipant && msg.recipientId === user?.uid));
        } else if (!isInstructor) {
          return msg.type === 'trip_private' && 
            ((msg.senderId === user?.uid && msg.recipientId === trip.instructorId) ||
             (msg.senderId === trip.instructorId && msg.recipientId === user?.uid));
        }
        return false;
        
      default:
        return false;
    }
  });

  // Add this debugging to see message types
  console.log('Filtered messages:', filteredMessages.map(msg => ({
    id: msg.id,
    type: msg.type,
    isBroadcast: msg.type?.includes('broadcast') || msg.isBroadcast,
    text: msg.text?.substring(0, 20)
  })));

  const filteredParticipants = trip?.participants?.filter(participant =>
    participant.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!isOpen) return null;

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
                    : 'trip_discussion',
                  currentUserId: user.uid
                };
                subscribeToMessages(params);
              }
            }}
          />
        )}

          {/* Tabs */}
          <div className="flex px-6 border-b">
            {/* Show broadcast tab for everyone, but only allow instructors to send broadcasts */}
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
            
            <button
              onClick={() => setActiveTab('discussion')}
              className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
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
                isInstructor={isInstructor}
              />
            ) : activeTab === 'broadcast' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                <MessageList
                  messages={filteredMessages.map(msg => ({
                    ...msg,
                    // Force the broadcast flag for trip_broadcast messages
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
                  isInstructor={isInstructor}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                />
                
                {/* Add typing indicator with conditional rendering */}
                {typingUsers && typingUsers.length > 0 && (
                  <TypingIndicator 
                    typingUsers={typingUsers} 
                    userProfiles={userProfiles}
                    currentUserId={user?.uid}
                  />
                )}
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
                  onReactionSelect={handleReaction}
                  loading={loading}
                  loadingMore={loadingMore}
                  error={error}
                  showBroadcastIndicator={false}
                  isInstructor={isInstructor}
                  hasMore={hasMore}
                  onLoadMore={handleLoadMore}
                />
                
                {/* Add typing indicator with conditional rendering */}
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
                            onReactionSelect={handleReaction}
                            loading={loading}
                            loadingMore={loadingMore}
                            error={error}
                            showBroadcastIndicator={false}
                            isInstructor={isInstructor}
                            hasMore={hasMore}
                            onLoadMore={handleLoadMore}
                          />
                          
                          {/* Add typing indicator with conditional rendering */}
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
                            onSend={(text, file) => handleSendMessage(text, file, 'private', selectedParticipant)}
                            placeholder="Message participant..."
                            isSending={isSending}
                            sendError={sendError}
                            typingParams={{
                              type: 'trip',
                              tripId: trip.id,
                              messageType: 'trip_private',
                              recipientId: selectedParticipant  // This is the critical field for private messaging!
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
                      onReactionSelect={handleReaction}
                      loading={loading}
                      loadingMore={loadingMore}
                      error={error}
                      showBroadcastIndicator={false}
                      isInstructor={isInstructor}
                      hasMore={hasMore}
                      onLoadMore={handleLoadMore}
                    />
                    
                    {/* Add typing indicator with conditional rendering */}
                    {typingUsers && typingUsers.length > 0 && (
                      <TypingIndicator 
                        typingUsers={typingUsers} 
                        userProfiles={userProfiles}
                        currentUserId={user?.uid}
                      />
                    )}
                  </div>
                  <MessageInput
                    onSend={(text, file) => handleSendMessage(text, file, 'private', trip.instructorId)}
                    placeholder="Message trip leader..."
                    isSending={isSending}
                    sendError={sendError}
                    typingParams={{
                      type: 'trip',
                      tripId: trip.id,
                      messageType: 'trip_private',
                      recipientId: trip.instructorId  // This is the critical field for private messaging!
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