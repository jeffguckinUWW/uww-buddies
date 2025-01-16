// src/services/MessageService.js
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
  DIRECT: 'direct',
  GROUP: 'group',
  COURSE: 'course',
  COURSE_BROADCAST: 'course_broadcast'
};

class MessageService {
  // Subscribe to messages for a specific context (course/chat)
  static subscribeToMessages(params, callback) {
    console.log('Subscribing to messages with params:', params);
    
    let messageQuery;
    if (params.type === 'course') {
      messageQuery = query(
        collection(db, 'messages'),
        where('courseId', '==', params.courseId),
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
            id: doc.id,  // Ensure we have the document ID
            ...data,
            timestamp: data.timestamp?.toDate() || new Date()
          };
        });
        
        // Check for duplicate IDs
        const ids = messages.map(m => m.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
          console.warn('Duplicate message IDs detected:', 
            ids.filter((id, index) => ids.indexOf(id) !== index)
          );
        }
        
        callback({ messages });
      },
      (error) => {
        console.error('Error in message subscription:', error);
        callback({ error: 'Failed to load messages' });
      }
    );
}

  // Send a new message
  static async sendMessage(messageData) {
    try {
      console.log('MessageService - Checking Chat:', messageData.chatId);
      // Verify chat exists and user is participant
      const chatDoc = await getDoc(doc(db, 'chats', messageData.chatId));
      if (!chatDoc.exists()) {
        console.error('Chat document does not exist');
        throw new Error('Chat not found');
      }
      
      const chatData = chatDoc.data();
      console.log('MessageService - Chat data:', chatData);
      console.log('MessageService - Active participants:', chatData.activeParticipants);
      console.log('MessageService - Current user:', messageData.senderId);

      // Get sender's profile data
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

      const newMessage = {
        ...baseMessage,
        ...messageData
      };

      console.log('MessageService - Attempting to create message:', newMessage);
      const messageRef = await addDoc(collection(db, 'messages'), newMessage);
      console.log('MessageService - Message created with ID:', messageRef.id);

      // Create notification for recipients
      const recipients = chatData.activeParticipants
        .filter(id => id !== messageData.senderId);
      console.log('MessageService - Notifying recipients:', recipients);

      // Create notifications for all recipients
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
        console.log('MessageService - Updating chat with last message');
        await updateDoc(doc(db, 'chats', messageData.chatId), {
          lastMessageAt: serverTimestamp(),
          lastMessage: {
            text: messageData.text,
            senderId: messageData.senderId,
            senderName
          }
        });
      }

      console.log('MessageService - All operations completed successfully');
      return { id: messageRef.id, ...newMessage };
    } catch (error) {
      console.error('MessageService - Detailed error:', error);
      console.error('MessageService - Error stack:', error.stack);
      throw new Error('Failed to send message');
    }
}

  // Mark message as read
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

  // Delete message (soft delete)
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

  // Delete chat for user
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

        // Remove current user from activeParticipants
        const updatedParticipants = chatData.activeParticipants.filter(id => id !== userId);

        // If this was the last participant, delete the chat and its messages
        if (updatedParticipants.length === 0) {
            // Delete chat document
            batch.delete(chatRef);

            // Delete all messages
            const messagesQuery = query(
                collection(db, 'messages'),
                where('chatId', '==', chatId)
            );
            const messages = await getDocs(messagesQuery);
            messages.forEach(message => {
                batch.delete(doc(db, 'messages', message.id));
            });
        } else {
            // Otherwise just update activeParticipants
            batch.update(chatRef, {
                activeParticipants: updatedParticipants
            });

            // Mark messages as deleted for this user
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