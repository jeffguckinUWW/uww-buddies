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
  arrayRemove,
  getDocs
} from 'firebase/firestore';

// Message type constants
export const MessageTypes = {
  DIRECT: 'direct',
  GROUP: 'group',
  COURSE: 'course',
  COURSE_BROADCAST: 'course_broadcast'
};

class MessageService {
  static subscribeToMessages(params, callback) {
    let messageQuery;

    if (params.type === 'course') {
      messageQuery = query(
        collection(db, 'messages'),
        where('courseId', '==', params.courseId),
        where('type', 'in', ['course', 'course_broadcast']),
        orderBy('timestamp', 'asc')
      );
    } else {
      messageQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', params.chatId),
        where('type', 'in', ['direct', 'group']),
        orderBy('timestamp', 'asc')
      );
    }

    return onSnapshot(messageQuery, 
      (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        callback({ messages });
      },
      (error) => {
        callback({ error: 'Failed to load messages' });
      }
    );
  }

  static async sendMessage(messageData) {
    try {
      const baseMessage = {
        timestamp: serverTimestamp(),
        readBy: [messageData.senderId],
        deletedFor: []
      };

      const newMessage = {
        ...baseMessage,
        ...messageData
      };

      const messageRef = await addDoc(collection(db, 'messages'), newMessage);

      if (messageData.type === 'direct' || messageData.type === 'group') {
        await updateDoc(doc(db, 'chats', messageData.chatId), {
          lastMessageAt: serverTimestamp()
        });
      }

      return { id: messageRef.id, ...newMessage };
    } catch (error) {
      console.error('Error sending message:', error);
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
      const batch = writeBatch(db);
      
      const chatRef = doc(db, 'chats', chatId);
      batch.update(chatRef, {
        [`participants.${userId}.active`]: false,
        activeParticipants: arrayRemove(userId)
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

      await batch.commit();
    } catch (error) {
      console.error('Error deleting chat:', error);
      throw new Error('Failed to delete chat');
    }
  }
}

export default MessageService;