import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  doc,
  writeBatch,
  arrayUnion,
  getDocs,
  getDoc
} from 'firebase/firestore';

export const MessageTypes = {
  CHAT: 'chat',
  COURSE_DISCUSSION: 'course_discussion',
  COURSE_PRIVATE: 'course_private',
  TRIP_DISCUSSION: 'trip_discussion',    
  TRIP_PRIVATE: 'trip_private'
};

class MessageService {
  static subscribeToMessages(params, callback) {
    console.log('Subscribing to messages with params:', params);
    let messageQuery;
    if (params.type === 'course') {
      messageQuery = query(
        collection(db, 'messages'),
        where('courseId', '==', params.courseId),
        orderBy('timestamp', 'asc')
      );
    } else if (params.type === 'trip') {  // Add this condition
      messageQuery = query(
        collection(db, 'messages'),
        where('tripId', '==', params.tripId),
        orderBy('timestamp', 'asc')
      );

    } else {
      messageQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', params.chatId),
        orderBy('timestamp', 'asc')
      );

    }

    return onSnapshot(messageQuery, 
      (snapshot) => {
        console.log('Message snapshot received:', snapshot.docs.length, 'messages');
        const messages = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          };
        });
        
        callback({ messages });
      },
      (error) => {
        console.error('Error in message subscription:', error);
        callback({ error: 'Failed to load messages' });
      }
    );
  }

  static async sendMessage(messageData) {
    try {
      const senderProfile = await getDoc(doc(db, 'profiles', messageData.senderId));
      const senderName = senderProfile.exists() ? 
        senderProfile.data().name || 'Unknown User' : 
        'Unknown User';
  
      const baseMessage = {
        timestamp: serverTimestamp(),
        readBy: [messageData.senderId],
        deletedFor: [],
        senderName
      };

      if (messageData.tripId) {
        const tripDoc = await getDoc(doc(db, 'trips', messageData.tripId));
        if (!tripDoc.exists()) {
          throw new Error('Trip not found');
        }
      
        const tripData = tripDoc.data();
        const isTripInstructor = tripData.instructorId === messageData.senderId;
        const isTripParticipant = tripData.participants?.some(p => p.uid === messageData.senderId);
      
        if (!isTripInstructor && !isTripParticipant) {
          throw new Error('Not authorized to send messages in this trip');
        }
      
        const newMessage = {
          ...baseMessage,
          ...messageData
        };
      
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
      
        let recipients = [];
        let notificationType = 'trip_message';
      
        if (messageData.type === MessageTypes.TRIP_DISCUSSION) {
          recipients = tripData.participants?.map(p => p.uid) || [];
          recipients = recipients.filter(id => id !== messageData.senderId);
        } else if (messageData.recipientId) {
          recipients = [messageData.recipientId];
        }
      
        await Promise.all(recipients.map(recipientId => 
          addDoc(collection(db, 'notifications'), {
            type: notificationType,
            fromUser: messageData.senderId,
            fromUserName: senderName,
            toUser: recipientId,
            tripId: messageData.tripId,
            messageId: messageRef.id,
            messagePreview: messageData.text.substring(0, 50),
            timestamp: serverTimestamp(),
            read: false
          })
        ));
      
        return { id: messageRef.id, ...newMessage };
      } 
      else if (messageData.courseId) {
        const courseDoc = await getDoc(doc(db, 'courses', messageData.courseId));
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
  
        const courseData = courseDoc.data();
        const isCourseInstructor = courseData.instructorId === messageData.senderId;
        const isCourseStudent = courseData.students?.some(s => s.uid === messageData.senderId);
  
        if (!isCourseInstructor && !isCourseStudent) {
          throw new Error('Not authorized to send messages in this course');
        }
  
        const newMessage = {
          ...baseMessage,
          ...messageData
        };
  
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
  
        let recipients = [];
        let notificationType = 'course_message';

        if (messageData.type === MessageTypes.COURSE_DISCUSSION) {
          recipients = [
            ...(courseData.students?.map(s => s.uid) || []),
            ...(courseData.assistants?.map(a => a.uid) || [])
          ].filter(id => id !== messageData.senderId);
        } else if (messageData.recipientId) {
          recipients = [messageData.recipientId];
        }

        await Promise.all(recipients.map(recipientId => 
          addDoc(collection(db, 'notifications'), {
            type: notificationType,
            fromUser: messageData.senderId,
            fromUserName: senderName,
            toUser: recipientId,
            courseId: messageData.courseId,
            messageId: messageRef.id,
            messagePreview: messageData.text.substring(0, 50),
            timestamp: serverTimestamp(),
            read: false
          })
        ));
  
        return { id: messageRef.id, ...newMessage };
      } 
      else {
        // Handle chat messages
        console.log('MessageService - Checking Chat:', messageData.chatId);
        const chatDoc = await getDoc(doc(db, 'chats', messageData.chatId));
        if (!chatDoc.exists()) {
          throw new Error('Chat not found');
        }
        
        const chatData = chatDoc.data();
        const newMessage = {
          ...baseMessage,
          ...messageData
        };
  
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
  
        const recipients = chatData.activeParticipants
          .filter(id => id !== messageData.senderId);
  
        await Promise.all(recipients.map(recipientId => 
          addDoc(collection(db, 'notifications'), {
            type: 'new_message',
            fromUser: messageData.senderId,
            fromUserName: senderName,
            toUser: recipientId,
            chatId: messageData.chatId,
            messageId: messageRef.id,
            messagePreview: messageData.text.substring(0, 50),
            timestamp: serverTimestamp(),
            read: false
          })
        ));
  
        if (messageData.type === 'direct' || messageData.type === 'group') {
          await updateDoc(doc(db, 'chats', messageData.chatId), {
            lastMessageAt: serverTimestamp(),
            lastMessage: {
              text: messageData.text,
              senderId: messageData.senderId,
              senderName
            }
          });
        }
  
        return { id: messageRef.id, ...newMessage };
      }
    } catch (error) {
      console.error('MessageService - Detailed error:', error);
      console.error('MessageService - Error stack:', error.stack);
      throw new Error('Failed to send message');
    }
  }

  static async markAsRead(messageId, userId) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        readBy: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  static async deleteMessage(messageId, userId) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        deletedFor: arrayUnion(userId)
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  static async deleteChat(chatId, userId) {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (!chatDoc.exists()) {
        throw new Error('Chat not found');
      }

      const chatData = chatDoc.data();
      if (!chatData.activeParticipants.includes(userId)) {
        throw new Error('Not authorized to access this chat');
      }

      const batch = writeBatch(db);
      const chatRef = doc(db, 'chats', chatId);

      const updatedParticipants = chatData.activeParticipants.filter(id => id !== userId);

      if (updatedParticipants.length === 0) {
        batch.delete(chatRef);

        const messagesQuery = query(
          collection(db, 'messages'),
          where('chatId', '==', chatId)
        );
        const messages = await getDocs(messagesQuery);
        messages.forEach(message => {
          batch.delete(doc(db, 'messages', message.id));
        });
      } else {
        batch.update(chatRef, {
          activeParticipants: updatedParticipants
        });

        const messagesQuery = query(
          collection(db, 'messages'),
          where('chatId', '==', chatId)
        );
        const messages = await getDocs(messagesQuery);
        messages.forEach(message => {
          batch.update(doc(db, 'messages', message.id), {
            deletedFor: arrayUnion(userId)
          });
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  }
}

export default MessageService;