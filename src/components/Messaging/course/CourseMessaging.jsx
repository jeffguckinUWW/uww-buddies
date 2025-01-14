import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useMessages } from '../../../context/MessageContext';
import { useAuth } from '../../../context/AuthContext';
import MessageInput from '../shared/MessageInput';
import MessageList from '../shared/MessageList';
import { MessageTypes } from '../../../services/MessageService';

const CourseMessaging = ({ 
  course, 
  isOpen, 
  onClose,
  messageRecipient = null // For instructor direct messages
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

  const isInstructor = course?.instructorId === user?.uid;

  useEffect(() => {
    if (!course?.id || !user?.uid) return;

    // Check if user has permission to view messages
    const hasPermission = 
      course.instructorId === user.uid || 
      course.students?.some(student => student.uid === user.uid) ||
      course.assistants?.some(assistant => assistant.uid === user.uid);

    if (!hasPermission) {
      console.error("User doesn't have permission to view messages");
      return;
    }

    // Subscribe to course messages
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
        type: isInstructor ? 
          (messageRecipient ? 'course' : 'course_broadcast') : 
          'course',
        readBy: [user.uid]
      };

      // Add recipient info for direct messages
      if (messageRecipient) {
        messageData.recipientId = messageRecipient.uid;
        messageData.recipientName = messageRecipient.displayName;
      }

      await sendMessage(messageData);

    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteMessage(messageId, user.uid);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  if (!isOpen) return null;

  const filteredMessages = messages.filter(msg => {
    // Show all messages to instructor
    if (isInstructor) return true;
    
    // For students, show broadcasts and their direct messages
    return msg.type === MessageTypes.COURSE_BROADCAST || 
           msg.senderId === user.uid || 
           msg.recipientId === user.uid;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[36rem] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {messageRecipient ? 
                `Message to ${messageRecipient.displayName}` : 
                `${course?.name} - Course Messages`
              }
            </h2>
            {!isInstructor && (
              <p className="text-sm text-gray-600">
                You can message your instructor directly
              </p>
            )}
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
          onDeleteMessage={handleDeleteMessage}
          loading={loading}
          error={error}
          className="flex-1"
        />

        {/* Input */}
        <div className="border-t p-4">
          <MessageInput 
            onSend={handleSendMessage}
            disabled={loading}
            placeholder={
              isInstructor ? 
                (messageRecipient ? 
                  `Message ${messageRecipient.displayName}...` : 
                  "Send a course announcement...") :
                "Message your instructor..."
            }
          />
        </div>
      </div>
    </div>
  );
};

export default CourseMessaging;