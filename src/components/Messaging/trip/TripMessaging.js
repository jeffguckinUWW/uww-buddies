// src/components/Messaging/trip/TripMessaging.js

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, User, Search } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import { Card } from '../../ui/card';
import { Alert, AlertDescription } from '../../ui/alert';

const TripMessaging = ({ trip, isOpen, onClose }) => {
  const { user } = useAuth();
  const { messages, loading, error, subscribeToMessages, sendMessage, deleteMessage } = useMessages();
  const [activeTab, setActiveTab] = useState('discussion');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isInstructor = trip?.instructorId === user?.uid;

  useEffect(() => {
    if (!trip?.id || !user?.uid) return;
    
    const unsubscribe = subscribeToMessages({
      type: 'trip',
      tripId: trip.id
    });
    
    return () => unsubscribe();
  }, [trip?.id, user?.uid, subscribeToMessages]);

  const handleSendMessage = async (text, type = 'discussion', recipientId = null) => {
    if (!text.trim() || !user || !trip) return;
    
    const messageData = {
      tripId: trip.id,
      senderId: user.uid,
      senderName: user.displayName || 'Unknown User',
      text: text.trim(),
      timestamp: new Date(),
      readBy: [user.uid],
      type: type === 'discussion' ? 'trip_discussion' : 'trip_private',
      ...(recipientId && { recipientId })
    };
    
    await sendMessage(messageData);
  };

  const filteredMessages = messages.filter(msg => {
    switch (activeTab) {
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
            <Alert variant="destructive" className="mx-4 mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Tabs */}
          <div className="flex px-6 border-b">
            <button
              onClick={() => setActiveTab('discussion')}
              className={`px-5 py-3 flex items-center gap-2 border-b-2 transition-colors
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

          <div className="flex-1 flex flex-col min-h-0">
            {activeTab === 'discussion' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <MessageList
                    messages={filteredMessages}
                    currentUserId={user?.uid}
                    onDeleteMessage={deleteMessage}
                    loading={loading}
                    error={error}
                  />
                </div>
                <div className="flex-shrink-0">
                  <MessageInput
                    onSend={(text) => handleSendMessage(text, 'discussion')}
                    placeholder={isInstructor ? "Post an announcement or start a discussion..." : "Type a message..."}
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
                              onDeleteMessage={deleteMessage}
                              loading={loading}
                              error={error}
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <MessageInput
                              onSend={(text) => handleSendMessage(text, 'private', selectedParticipant)}
                              placeholder="Message participant..."
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
                        onDeleteMessage={deleteMessage}
                        loading={loading}
                        error={error}
                      />
                    </div>
                    <MessageInput
                      onSend={(text) => handleSendMessage(text, 'private', trip.instructorId)}
                      placeholder="Message trip leader..."
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