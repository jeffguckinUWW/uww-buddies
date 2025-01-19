import React, { useEffect, useState } from 'react';
import { X, Users, MessageCircle } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import { MessageTypes } from '../../../services/MessageService';

const CourseMessaging = ({ 
  course, 
  isOpen, 
  onClose,
  messageRecipient = null,
  readOnly = false,
  defaultView = 'broadcast'  // Changed from messageType to defaultView
}) => {
  const { user } = useAuth();
  const { 
    messages, 
    loading, 
    error,
    subscribeToMessages, 
    sendMessage,
    deleteMessage 
  } = useMessages();

  const [activeView, setActiveView] = useState(defaultView);
  const isInstructor = course?.instructorId === user?.uid;

  useEffect(() => {
    if (!course?.id || !user?.uid) return;

    // Determine user's role and permissions
    const isStudent = course.students?.some(student => student.uid === user.uid);
    const isAssistant = course.assistants?.some(assistant => assistant.uid === user.uid);
    const isInstructor = course.instructorId === user.uid;

    // Check permissions
    const hasPermission = isInstructor || isStudent || isAssistant;
    if (!hasPermission) {
      console.error("User isn't a member of this course");
      return;
    }

    const unsubscribe = subscribeToMessages({
      type: 'course',
      courseId: course.id
    });

    return () => unsubscribe();
  }, [course, user, subscribeToMessages]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || !user || !course) return;
  
    try {
      const messageData = {
        courseId: course.id,
        senderId: user.uid,
        senderName: user.displayName || 'Unknown User',
        text: text.trim(),
        type: 'course',  // Always 'course' for student messages
        readBy: [user.uid],
        timestamp: new Date()
      };
  
      // Add recipient info for direct messages
      if (!isInstructor) {
        // Students always send to instructor
        messageData.recipientId = course.instructorId;
        messageData.recipientName = course.instructor?.displayName;
      } else if (messageRecipient) {
        messageData.recipientId = messageRecipient.uid;
        messageData.recipientName = messageRecipient.displayName;
      } else if (activeView === 'broadcast') {  // Changed from messageType to activeView
        messageData.type = 'course_broadcast';
      }
  
      await sendMessage(messageData);
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (activeView === 'broadcast') {
      return msg.type === MessageTypes.COURSE_BROADCAST;
    }

    if (activeView === 'direct') {
      if (isInstructor) {
        return msg.type === MessageTypes.COURSE &&
               !msg.type.includes('broadcast');
      } else {
        // For students, show direct messages with instructor
        return (msg.senderId === user?.uid && msg.recipientId === course.instructorId) ||
               (msg.senderId === course.instructorId && msg.recipientId === user?.uid);
      }
    }

    return true; // Show all messages in combined view
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[36rem] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {course?.name} - Course Messages
            </h2>
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setActiveView('broadcast')}
                className={`flex items-center gap-1 text-sm ${
                  activeView === 'broadcast' 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-600'
                }`}
              >
                <Users size={16} />
                Announcements
              </button>
              <button
                onClick={() => setActiveView('direct')}
                className={`flex items-center gap-1 text-sm ${
                  activeView === 'direct' 
                    ? 'text-blue-600 font-medium' 
                    : 'text-gray-600'
                }`}
              >
                <MessageCircle size={16} />
                {isInstructor ? 'Direct Messages' : 'Message Instructor'}
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        <MessageList
          messages={filteredMessages}
          currentUserId={user?.uid}
          onDeleteMessage={deleteMessage}
          loading={loading}
          error={error}
          className="flex-1"
        />

        {/* Input */}
        {activeView !== 'broadcast' || isInstructor ? (
          <div className="border-t p-4">
            <MessageInput 
              onSend={handleSendMessage}
              disabled={loading}
              placeholder={
                isInstructor ? 
                  (activeView === 'broadcast' ? 
                    "Send a course announcement..." :
                    "Send a direct message..."
                  ) :
                  "Message your instructor..."
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CourseMessaging;