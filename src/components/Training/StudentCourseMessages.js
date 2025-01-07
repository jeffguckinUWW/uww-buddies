import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import MessageInput from '../Messaging/MessageInput';

const StudentCourseMessages = ({ course }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Handle marking messages as read - wrapped in useCallback
  const markMessageAsRead = useCallback(async (messageId) => {
    if (!user?.uid) return;
    
    try {
      const messageRef = doc(db, 'courseMessages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(user.uid)
      });
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  }, [user?.uid]);

  // Listen for course messages
  useEffect(() => {
    if (!user?.uid || !course?.id) return;

    const q = query(
      collection(db, 'courseMessages'),
      where('courseId', '==', course.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = [];
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        
        // Auto-mark broadcast messages as read
        if (messageData.type === 'broadcast' && 
            (!messageData.readBy || !messageData.readBy.includes(user.uid))) {
          markMessageAsRead(doc.id);
        }

        messageList.push({ 
          id: doc.id, 
          ...messageData,
          timestamp: messageData.timestamp?.toDate()
        });
      });
      setMessages(messageList);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching course messages:', err);
      setError('Failed to load messages');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, course, markMessageAsRead]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || !user || !course) return;

    try {
        setLoading(true);
        
        // Create message with consistent structure
        const messageData = {
            courseId: course.id,
            senderId: user.uid,
            senderName: user.displayName || 'Student',
            text: text.trim(),
            timestamp: serverTimestamp(),
            type: 'individual',  // Students can only send individual messages
            recipientId: course.instructorId,
            recipientName: course.instructor?.displayName,
            readBy: [user.uid]  // Mark as read by sender
        };

        // Save message
        const messageRef = await addDoc(collection(db, 'courseMessages'), messageData);

        // Create notification for instructor
        await addDoc(collection(db, 'notifications'), {
            type: 'course_message',
            courseId: course.id,
            courseName: course.name,
            fromUser: user.uid,
            fromUserName: user.displayName || 'Student',
            toUser: course.instructorId,
            messageId: messageRef.id,
            messagePreview: text.length > 50 ? `${text.substring(0, 50)}...` : text,
            messageType: 'individual',
            timestamp: serverTimestamp(),
            read: false
        });

    } catch (err) {
        console.error('Error sending message:', err);
        setError('Failed to send message');
    } finally {
        setLoading(false);
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        Loading messages...
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded">
          {error}
        </div>
      )}

      <div 
        className="h-96 overflow-y-auto mb-4 p-4 border rounded"
        ref={(el) => {
          if (el) {
            el.scrollTop = el.scrollHeight;
          }
        }}
      >
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.senderId === user?.uid
                      ? 'bg-blue-500 text-white'
                      : message.type === 'broadcast'
                      ? 'bg-green-100 text-gray-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.senderId !== user?.uid && (
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium">
                        {message.senderName}
                      </span>
                      {message.type === 'broadcast' && (
                        <span className="text-xs bg-green-200 px-2 py-0.5 rounded-full">
                          Broadcast
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <p>{message.text}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {message.timestamp?.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MessageInput
        onSend={handleSendMessage}
        disabled={loading}
        placeholder="Message your instructor..."
      />
    </div>
  );
};

export default StudentCourseMessages;