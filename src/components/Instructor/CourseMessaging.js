import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';import { useAuth } from '../../context/AuthContext';
import MessageInput from '../Messaging/MessageInput';
import MessageReadReceipts from './MessageReadReceipts';
import { X } from 'lucide-react';

const CourseMessaging = ({ course, isOpen, onClose }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInstructor, setIsInstructor] = useState(false);

    // Check if user is instructor
    useEffect(() => {
        if (!user?.uid) return;
        setIsInstructor(course.instructorId === user.uid);
    }, [user, course]);

    useEffect(() => {
        if (!course?.id || !user?.uid) return;

        // Check if user has permission to view messages
        const hasPermission = 
            course.instructorId === user.uid || 
            course.students?.some(student => student.uid === user.uid) ||
            course.assistants?.some(assistant => assistant.uid === user.uid);

        if (!hasPermission) {
            setError("You don't have permission to view these messages");
            setLoading(false);
            return;
        }

        // Match existing index structure exactly
        const q = query(
            collection(db, 'courseMessages'),
            where('courseId', '==', course.id),
            orderBy('timestamp', 'desc'),
            orderBy('__name__', 'desc')
        );
        
        console.log('Course ID for query:', course.id);
        
        console.log('Querying messages for course:', course.id);

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const processedMessages = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        timestamp: doc.data().timestamp?.toDate()
                    }))
                    .sort((a, b) => {
                        // Sort by timestamp descending (newest first)
                        const timeA = a.timestamp?.getTime() || 0;
                        const timeB = b.timestamp?.getTime() || 0;
                        return timeB - timeA;
                    })
                    .filter(msg => {
                        // Debug log
                        console.log('Processing message:', {
                            id: msg.id,
                            type: msg.type,
                            senderId: msg.senderId,
                            recipientId: msg.recipientId
                        });
                        
                        // Show all messages to instructor
                        if (isInstructor) return true;
                        
                        // For students/assistants, show:
                        // 1. Course-wide messages
                        // 2. Individual messages where they're involved
                        return msg.type === 'course' || 
                               msg.senderId === user.uid || 
                               msg.recipientId === user.uid;
                    });
                
                setMessages(processedMessages);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('Error fetching course messages:', err);
                setError('Failed to load messages. Please try again later.');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [course, user, isInstructor]);

    const handleSendMessage = async (text) => {
        try {
            // Get sender's profile data first
            const profileRef = doc(db, 'profiles', user.uid);
            const profileSnap = await getDoc(profileRef);
            const senderName = profileSnap.exists() ? 
                (profileSnap.data().name || profileSnap.data().displayName) : 
                (user.displayName || 'Unknown User');
            
            const messageType = !isInstructor ? 'individual' : 
                              (course?.messageRecipient ? 'individual' : 'broadcast');
            
            const messageData = {
                courseId: course.id,
                senderId: user.uid,
                senderName: senderName,  // Use the name from profile
                text: text,
                timestamp: serverTimestamp(),
                type: messageType,
                readBy: [user.uid]
            };
    
            // For individual messages, add recipient info
            if (messageType === 'individual') {
                const recipientId = !isInstructor ? 
                    course.instructorId : 
                    course?.messageRecipient?.uid;
                
                messageData.recipientId = recipientId;
                messageData.recipientName = !isInstructor ? 
                    course.instructor?.displayName : 
                    course?.messageRecipient?.displayName;
            }
    
            // Create the message
            const messageRef = await addDoc(collection(db, 'courseMessages'), messageData);
    
            // Create notifications for recipients
            let notificationData = {
                type: 'course_message',
                courseId: course.id,
                courseName: course.name,
                fromUser: user.uid,
                fromUserName: user.displayName || 'Unknown User',
                messageId: messageRef.id,
                messagePreview: text.length > 50 ? `${text.substring(0, 50)}...` : text,
                messageType: messageType,
                timestamp: serverTimestamp(),
                read: false
            };
    
            if (messageType === 'broadcast') {
                // Create notifications for all students
                if (course.students) {
                    for (const student of course.students) {
                        await addDoc(collection(db, 'notifications'), {
                            ...notificationData,
                            toUser: student.uid
                        });
                    }
                }
            } else {
                // Create notification for individual recipient
                await addDoc(collection(db, 'notifications'), {
                    ...notificationData,
                    toUser: messageData.recipientId
                });
            }
    
            return true;
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message. Please try again.');
            throw err;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl h-[36rem] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                            {course?.messageRecipient ? 
                                `Message to ${course.messageRecipient.displayName}` : 
                                `${course?.name} - Course Messages`
                            }
                        </h2>
                        <p className="text-sm text-gray-600">
                            {!isInstructor && 
                                "You can only message the instructor directly"}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            Loading messages...
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500">
                            {error}
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {isInstructor ? 
                                "No messages yet. Start the conversation!" :
                                "No messages yet. You can message your instructor here."}
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div 
                                key={msg.id} 
                                className={`flex flex-col rounded-lg p-3 transition-colors ${
                                    msg.senderId === user?.uid 
                                        ? 'bg-blue-50 hover:bg-blue-100 ml-8' 
                                        : 'bg-gray-50 hover:bg-gray-100 mr-8'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-gray-900">
                                        {msg.senderId === user?.uid ? 'You' : msg.senderName || 'Unknown User'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {msg.timestamp?.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-700">{msg.text}</p>
                                {msg.type === 'individual' && (
                                    <span className="text-xs text-gray-500 mt-1">
                                        Private message
                                    </span>
                                )}
                                <MessageReadReceipts messageId={msg.id} />
                            </div>
                        ))
                    )}
                </div>

                {/* Message Input */}
                {!error && (
                    <div className="border-t p-4">
                        <MessageInput 
                            onSend={handleSendMessage}
                            disabled={loading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseMessaging;