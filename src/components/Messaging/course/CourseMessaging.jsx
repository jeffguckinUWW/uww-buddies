import React, { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, User, Search, Megaphone } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import ThreadView from '../shared/ThreadView';
import { Card } from '../../../components/ui/card';
import EnhancedErrorAlert from '../../../components/ui/EnhancedErrorAlert';
import SearchBar from '../shared/SearchBar';
import SearchResults from '../shared/SearchResults';
import TypingIndicator from '../shared/TypingIndicator';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';

const CourseMessaging = ({ 
  course, 
  isOpen, 
  onClose, 
  isTripMessaging = false,
  messageType,
  defaultView = 'discussion',
  showBroadcasts = false 
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
    subscribeToTypingStatus,
    setTypingStatus,
    typingUsers,
    loadMoreMessages,
    sendMessage,
    sendMessageWithFile,
    deleteMessage,
    deleteMessageWithFile,
    editMessage,
    addReaction
  } = useMessages();
  
  const [activeTab, setActiveTab] = useState(defaultView);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeThread, setActiveThread] = useState(null);
  const [showThreadView, setShowThreadView] = useState(false);
  const isInstructor = course?.instructorId === user?.uid;
  const [userProfiles, setUserProfiles] = useState({});

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
    if (!course?.id || !user?.uid) return;
    
    const typingParams = {
      type: 'course',
      courseId: course.id,
      messageType: activeTab === 'broadcast' 
        ? (isTripMessaging ? 'trip_broadcast' : 'course_broadcast')
        : (isTripMessaging ? 'trip_discussion' : 'course_discussion')
    };
    
    const unsubscribe = subscribeToTypingStatus(typingParams);
    
    return () => {
      unsubscribe();
      // Make sure to set typing status to false when unmounting
      setTypingStatus(typingParams, false);
    };
  }, [course?.id, user?.uid, activeTab, isTripMessaging, subscribeToTypingStatus, setTypingStatus]);  

  useEffect(() => {
    if (!course?.id || !user?.uid) return;

    const unsubscribes = [];

    if (activeTab === 'broadcast' && isInstructor) {
      unsubscribes.push(
        subscribeToMessages({
          type: 'course',
          courseId: course.id,
          messageType: isTripMessaging ? 'trip_broadcast' : 'course_broadcast'
        })
      );
    } else if (activeTab === 'discussion' || activeTab === 'combined') {
      unsubscribes.push(
        subscribeToMessages({
          type: 'course',
          courseId: course.id,
          messageType: isTripMessaging ? 'trip_discussion' : 'course_discussion'
        })
      );
      
      if (showBroadcasts || activeTab === 'combined') {
        unsubscribes.push(
          subscribeToMessages({
            type: 'course',
            courseId: course.id,
            messageType: isTripMessaging ? 'trip_broadcast' : 'course_broadcast'
          })
        );
      }
    } else if (activeTab === 'private') {
      unsubscribes.push(
        subscribeToMessages({
          type: 'course',
          courseId: course.id,
          messageType: isTripMessaging ? 'trip_private' : 'course_private'
        })
      );
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [course?.id, user?.uid, subscribeToMessages, isTripMessaging, activeTab, isInstructor, showBroadcasts]);

  const handleReaction = useCallback(async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  }, [addReaction]);

  const handleLoadMore = useCallback(() => {
    const params = {
      type: 'course',
      courseId: course?.id,
      messageType: isTripMessaging 
        ? (activeTab === 'broadcast' ? 'trip_broadcast' : 'trip_discussion')
        : (activeTab === 'broadcast' ? 'course_broadcast' : 'course_discussion')
    };
    loadMoreMessages(params);
  }, [loadMoreMessages, course?.id, isTripMessaging, activeTab]);

  const handleSendMessage = async (text, file, type = activeTab, recipientId = null) => {
    if ((!text.trim() && !file) || !user || !course) return;
    
    setIsSending(true);
    setSendError(null);
    
    try {
      let messageType;
      switch (type) {
        case 'broadcast':
          messageType = isTripMessaging ? 'trip_broadcast' : 'course_broadcast';
          break;
        case 'private':
          messageType = isTripMessaging ? 'trip_private' : 'course_private';
          break;
        default:
          messageType = isTripMessaging ? 'trip_discussion' : 'course_discussion';
      }
  
      let readTracking = {};
      if (messageType.includes('broadcast')) {
        const participants = [
          ...(course.students || []),
          ...(course.assistants || [])
        ].map(p => ({
          uid: p.uid,
          name: p.displayName || 'Unknown User'
        }));
  
        readTracking = {
          readBy: [user.uid],
          readStatus: participants.reduce((acc, participant) => {
            acc[participant.uid] = {
              read: false,
              readAt: null,
              name: participant.name
            };
            return acc;
          }, {}),
          totalRecipients: participants.length,
          readCount: 0
        };
      }
  
      const messageData = {
        [isTripMessaging ? 'tripId' : 'courseId']: course.id,
        senderId: user.uid,
        senderName: user.displayName || 'Unknown User',
        text: text.trim(),
        timestamp: new Date(),
        type: messageType,
        ...(recipientId && { recipientId }),
        ...(messageType.includes('broadcast') && readTracking)
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

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'combined') {
      return msg.type.includes('discussion') || (showBroadcasts && msg.type.includes('broadcast'));
    }

    switch (activeTab) {
      case 'broadcast':
        return msg.type === (isTripMessaging ? 'trip_broadcast' : 'course_broadcast');
      case 'discussion':
        return msg.type === (isTripMessaging ? 'trip_discussion' : 'course_discussion');
      case 'private':
        return msg.type === (isTripMessaging ? 'trip_private' : 'course_private') && 
          (msg.senderId === user?.uid || msg.recipientId === user?.uid ||
           (isInstructor && (msg.senderId === selectedStudent || msg.recipientId === selectedStudent)));
      default:
        return false;
    }
  });

  const handleEditMessage = async (messageId, newText) => {
    try {
      await editMessage(messageId, newText, user.uid);
    } catch (error) {
      console.error('Error editing message:', error);
      // Optionally show an error toast or notification
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

  const filteredStudents = course?.students?.filter(student =>
    student.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
              courseId={course.id}
              isTripMessaging={isTripMessaging}
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
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-xl text-gray-800">
              {course?.name} - {isTripMessaging ? 'Trip' : 'Course'} Communications
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
                if (course?.id && user?.uid) {
                  const params = {
                    type: 'course',
                    courseId: course.id,
                    messageType: isTripMessaging 
                      ? (activeTab === 'broadcast' ? 'trip_broadcast' : 'trip_discussion')
                      : (activeTab === 'broadcast' ? 'course_broadcast' : 'course_discussion')
                  };
                  subscribeToMessages(params);
                }
              }}
            />
          )}

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
              onClick={() => setActiveTab(showBroadcasts ? 'combined' : 'discussion')}
              className={`px-5 py-3 ${!isInstructor ? '' : 'ml-6'} flex items-center gap-2 border-b-2 transition-colors
                ${(activeTab === 'discussion' || activeTab === 'combined')
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <MessageSquare size={18} />
              <span>{isTripMessaging ? 'Trip Discussion' : 'Class Discussion'}</span>
            </button>
            <button
              onClick={() => setActiveTab('private')}
              className={`px-5 py-3 ml-6 flex items-center gap-2 border-b-2 transition-colors
                ${activeTab === 'private' 
                  ? 'border-[#4460F1] text-[#4460F1]' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <User size={18} />
              <span>{isInstructor ? 'Participant Messages' : 'Message Instructor'}</span>
            </button>
          </div>

          {/* Search Bar - New Addition */}
          {activeTab !== 'private' && (
            <div className="px-6 py-3 border-b">
              <SearchBar 
                params={{
                  type: 'course',
                  courseId: course.id,
                  messageType: activeTab === 'broadcast' 
                    ? 'course_broadcast' 
                    : 'course_discussion'
                }}
              />
            </div>
          )}

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
                </div>
                {isInstructor && (
                  <div className="flex-shrink-0">
                    <MessageInput
                    onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                    placeholder={isInstructor ? "Start a discussion..." : "Type a message..."}
                    isSending={isSending}
                    sendError={sendError}
                    typingParams={{
                      type: 'course',
                      courseId: course.id,
                      messageType: isTripMessaging ? 'trip_discussion' : 'course_discussion'
                    }}
                    onTypingStatus={setTypingStatus}
                  />
                  </div>
                )}
              </div>
            ) : activeTab === 'discussion' || activeTab === 'combined' ? (
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
              </div>

              {/* Add typing indicator after MessageList */}
              <TypingIndicator 
                typingUsers={typingUsers} 
                userProfiles={userProfiles}
                currentUserId={user?.uid}
              />
                <div className="flex-shrink-0">
                <MessageInput
                  onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                  placeholder={isInstructor ? "Start a discussion..." : "Type a message..."}
                  isSending={isSending}
                  sendError={sendError}
                  typingParams={{
                    type: 'course',
                    courseId: course.id,
                    messageType: isTripMessaging ? 'trip_discussion' : 'course_discussion'
                  }}
                  onTypingStatus={setTypingStatus}
                />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {isInstructor ? (
                  <>
                    <div className="w-80 flex-shrink-0 border-r flex flex-col">
                      <div className="p-4">
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                          <Search className="text-gray-400" size={16} />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search students..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 placeholder-gray-400"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        {filteredStudents.map(student => (
                          <button
                            key={student.uid}
                            onClick={() => setSelectedStudent(student.uid)}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors
                              ${selectedStudent === student.uid ? 'bg-[#4460F1]/5 hover:bg-[#4460F1]/5' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {student.photoURL ? (
                                  <img 
                                    src={student.photoURL} 
                                    alt={student.displayName}
                                    className="w-full h-full rounded-full"/>
                                  ) : (
                                    <span className="text-sm text-gray-600">
                                      {student.displayName
                                        ?.split(' ')
                                        .map(n => n[0])
                                        .join('')
                                        .toUpperCase()
                                        .slice(0, 2) || '??'}
                                    </span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm text-gray-800 truncate">
                                    {student.displayName}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {student.email}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
  
                      <div className="flex-1 flex flex-col min-w-0 bg-white">
                        {selectedStudent ? (
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
                          </div>

                          {/* Add typing indicator after MessageList */}
                          <TypingIndicator 
                            typingUsers={typingUsers} 
                            userProfiles={userProfiles}
                            currentUserId={user?.uid}
                          />
                            <div className="flex-shrink-0">
                            <MessageInput
                              onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                              placeholder={isInstructor ? "Start a discussion..." : "Type a message..."}
                              isSending={isSending}
                              sendError={sendError}
                              typingParams={{
                                type: 'course',
                                courseId: course.id,
                                messageType: isTripMessaging ? 'trip_discussion' : 'course_discussion'
                              }}
                              onTypingStatus={setTypingStatus}
                            />
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                              <div className="text-3xl mb-3">👋</div>
                              <p>Select a student to start messaging</p>
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
                    </div>

                    {/* Add typing indicator after MessageList */}
                    <TypingIndicator 
                      typingUsers={typingUsers} 
                      userProfiles={userProfiles}
                      currentUserId={user?.uid}
                    />

                    {/* Add typing indicator after MessageList */}
                    <TypingIndicator 
                      typingUsers={typingUsers} 
                      userProfiles={userProfiles}
                      currentUserId={user?.uid}
                    />
                      <MessageInput
                        onSend={(text, file) => handleSendMessage(text, file, 'discussion')}
                        placeholder={isInstructor ? "Start a discussion..." : "Type a message..."}
                        isSending={isSending}
                        sendError={sendError}
                        typingParams={{
                          type: 'course',
                          courseId: course.id,
                          messageType: isTripMessaging ? 'trip_discussion' : 'course_discussion'
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
  
  export default CourseMessaging;