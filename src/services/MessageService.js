import { storage, db } from '../firebase/config';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  doc,
  writeBatch,
  arrayUnion,
  getDocs,
  getDoc,
  limit,
  deleteDoc,
  startAfter
} from 'firebase/firestore';
import { 
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { handleError, AppError, ErrorTypes } from '../lib/utils';
import NotificationService from './NotificationService';
import { MessageTypes } from './MessageConstants';

// Re-export MessageTypes for backward compatibility
export { MessageTypes };

const MESSAGES_PER_PAGE = 25;
const INITIAL_MESSAGES_LIMIT = 50;

class MessageService {
  static async fetchOlderMessages(params, lastMessage) {
    try {
      let messageQuery;
      
      if (params.type === 'course') {
        messageQuery = query(
          collection(db, 'messages'),
          where('courseId', '==', params.courseId),
          where('type', '==', params.messageType),
          orderBy('timestamp', 'desc'),
          ...(lastMessage ? [startAfter(lastMessage.timestamp)] : []),
          limit(MESSAGES_PER_PAGE)
        );
      } 
      else if (params.type === 'trip') {
        messageQuery = query(
          collection(db, 'messages'),
          where('tripId', '==', params.tripId),
          where('type', '==', params.messageType),
          orderBy('timestamp', 'desc'),
          ...(lastMessage ? [startAfter(lastMessage.timestamp)] : []),
          limit(MESSAGES_PER_PAGE)
        );
      } 
      else {
        messageQuery = query(
          collection(db, 'messages'),
          where('chatId', '==', params.chatId),
          where('type', '==', MessageTypes.CHAT),
          orderBy('timestamp', 'desc'),
          ...(lastMessage ? [startAfter(lastMessage.timestamp)] : []),
          limit(MESSAGES_PER_PAGE)
        );
      }

      const snapshot = await getDocs(messageQuery);
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      });

      return {
        messages,
        hasMore: messages.length === MESSAGES_PER_PAGE
      };
    } catch (error) {
      console.error('Error fetching older messages:', error);
      throw new Error('Failed to load older messages');
    }
  }

  static subscribeToTypingStatus(params, callback) {
    try {
      // Get reference to typing status collection
      const typingStatusRef = collection(db, 'typingStatus');
      
      // Create a query for active typing statuses
      let q;
      
      if (params.courseId) {
        q = query(
          typingStatusRef,
          where('type', '==', 'course'),
          where('contextId', '==', params.courseId),
          where('messageType', '==', params.messageType),
          where('isTyping', '==', true)
        );
      } else if (params.tripId) {
        q = query(
          typingStatusRef,
          where('type', '==', 'trip'),
          where('contextId', '==', params.tripId),
          where('messageType', '==', params.messageType),
          where('isTyping', '==', true)
        );
      } else if (params.chatId) {
        q = query(
          typingStatusRef,
          where('type', '==', 'chat'),
          where('contextId', '==', params.chatId),
          where('isTyping', '==', true)
        );
      } else {
        console.error('Invalid typing status parameters');
        callback([]);
        return () => {};
      }
      
      // Setup subscription with error handling
      return onSnapshot(q, 
        (snapshot) => {
          const typingUsers = snapshot.docs.map(doc => doc.data().userId);
          callback(typingUsers);
        }, 
        (error) => {
          console.error('Error in typing status subscription:', error);
          // Call callback with empty array to avoid breaking UI
          callback([]);
        }
      );
    } catch (error) {
      console.error('Error setting up typing subscription:', error);
      // Return a no-op function and call callback with empty array
      callback([]);
      return () => {};
    }
  }

  static async addReaction(messageId, userId, emoji, userName) {
    try {
      // Input validation
      if (!messageId || !userId || !emoji) {
        console.error('Missing required parameters for addReaction:', { messageId, userId, emoji });
        throw new Error('Missing required reaction parameters');
      }
      
      // Use a safer name if not provided
      const safeUserName = userName || 'Unknown User';
      
      // Get message reference
      const messageRef = doc(db, 'messages', messageId);
      
      // First check if message exists to avoid errors
      const messageSnap = await getDoc(messageRef);
      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }
      
      const messageData = messageSnap.data();
      let reactions = { ...(messageData.reactions || {}) };
      
      // Check if user already reacted with this emoji
      const hasReacted = reactions[emoji]?.users?.[userId];
      
      if (hasReacted) {
        // User already reacted, remove the reaction
        const newUsers = { ...reactions[emoji].users };
        delete newUsers[userId];
        
        const newCount = Math.max(0, (reactions[emoji].count || 1) - 1);
        
        if (newCount === 0) {
          // No reactions left for this emoji, remove it
          const { [emoji]: removed, ...remainingReactions } = reactions;
          reactions = remainingReactions;
        } else {
          // Update the reaction with user removed
          reactions[emoji] = {
            count: newCount,
            users: newUsers
          };
        }
      } else {
        // Add new reaction
        reactions[emoji] = {
          count: ((reactions[emoji]?.count) || 0) + 1,
          users: {
            ...(reactions[emoji]?.users || {}),
            [userId]: {
              name: safeUserName,
              timestamp: new Date()
            }
          }
        };
      }
      
      // Update the message with new reactions
      await updateDoc(messageRef, { reactions });
      
      return {
        id: messageId,
        reactions
      };
    } catch (error) {
      console.error('Error in addReaction:', error);
      throw new Error('Failed to add reaction');
    }
  }
  
  static getCommonEmojis() {
    return [
      "👍", "❤️", "😂", "🎉", "😍", 
      "👏", "🙌", "🔥", "✅", "👌",
      "🤔", "😊", "🙏", "👀", "😭",
      "😢", "🥳", "🤩", "😳", "🙂"
    ];
  }
  
  static getUsersForReaction(reaction) {
    if (!reaction || !reaction.users) return [];
    
    return Object.entries(reaction.users).map(([userId, data]) => ({
      id: userId,
      name: data.name,
      timestamp: data.timestamp
    }));
  }
  
  static getSortedReactions(reactions) {
    if (!reactions) return [];
    
    return Object.entries(reactions)
      .map(([emoji, data]) => ({
        emoji,
        count: data.count,
        users: this.getUsersForReaction(data)
      }))
      .sort((a, b) => b.count - a.count);
  }

  static async uploadFile(file, path) {
    try {
      // Validate file and path
      if (!file) {
        throw new AppError('File is required', ErrorTypes.VALIDATION);
      }
      
      if (!path) {
        throw new AppError('Upload path is required', ErrorTypes.VALIDATION);
      }
      
      // Generate a safe file name and path
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileRef = storageRef(storage, `${path}/${safeName}_${Date.now()}`);
      
      const metadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          size: file.size.toString()
        }
      };
  
      try {
        const snapshot = await uploadBytes(fileRef, file, metadata);
        const downloadURL = await getDownloadURL(snapshot.ref);
  
        return {
          url: downloadURL,
          path: snapshot.ref.fullPath,
          name: file.name,
          type: file.type,
          size: file.size
        };
      } catch (storageError) {
        if (storageError.code === 'storage/unauthorized') {
          throw new AppError(
            'You do not have permission to upload this file',
            ErrorTypes.PERMISSION,
            storageError
          );
        } else if (storageError.code?.includes('network')) {
          throw new AppError(
            'Network error occurred while uploading the file. Please check your connection.',
            ErrorTypes.NETWORK,
            storageError
          );
        } else {
          throw handleError(storageError, 'uploadFile:storage');
        }
      }
    } catch (error) {
      throw handleError(error, 'uploadFile');
    }
  }
  
  static async sendMessageWithFile(messageData, file) {
    let fileInfo = null;
    
    try {
      // Input validation
      if ((!messageData.text && !file) || !messageData.senderId) {
        throw new AppError(
          'Message or file and sender information are required',
          ErrorTypes.VALIDATION
        );
      }
  
      if (file) {
        // File validation
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          throw new AppError(
            'File size must be less than 10MB',
            ErrorTypes.VALIDATION
          );
        }
  
        // Determine upload path based on message type
        const uploadPath = messageData.courseId 
          ? `courses/${messageData.courseId}/files`
          : messageData.tripId
          ? `trips/${messageData.tripId}/files`
          : `chats/${messageData.chatId}/files`;
  
        try {
          fileInfo = await this.uploadFile(file, uploadPath);
        } catch (uploadError) {
          throw handleError(uploadError, 'sendMessageWithFile:uploadFile');
        }
      }
  
      const messageWithFile = {
        ...messageData,
        fileAttachment: fileInfo ? {
          ...fileInfo,
          timestamp: new Date()
        } : null
      };
  
      try {
        return await this.sendMessage(messageWithFile);
      } catch (sendError) {
        // If message send fails, clean up the file
        if (fileInfo?.path) {
          try {
            await this.deleteFile(fileInfo.path);
          } catch (deleteError) {
            console.error('Error cleaning up file:', deleteError);
          }
        }
        throw handleError(sendError, 'sendMessageWithFile:sendMessage');
      }
    } catch (error) {
      throw handleError(error, 'sendMessageWithFile');
    }
  }
  
  static async deleteFile(filePath) {
    try {
      const fileRef = storageRef(storage, filePath);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }
  
  static getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    if (fileType.includes('pdf')) return 'pdf';
    if (fileType.includes('word')) return 'word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'excel';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return 'powerpoint';
    return 'file';
  }
  
  static getFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }

  static async setTypingStatus(params, userId, isTyping = true) {
    try {
      // Skip if we don't have all required parameters
      if (!userId || !params) return;
      
      // Create a unique ID for the typing status
      let typeValue = 'unknown';
      let contextId = 'unknown';
      
      if (params.courseId) {
        typeValue = 'course';
        contextId = params.courseId;
      } else if (params.tripId) {
        typeValue = 'trip';
        contextId = params.tripId;
      } else if (params.chatId) {
        typeValue = 'chat';
        contextId = params.chatId;
      } else {
        // No valid context, so we'll exit early
        return;
      }
      
      const typingId = `${typeValue}_${contextId}_${params.messageType || 'unknown'}_${userId}`;
      const typingRef = doc(db, 'typingStatus', typingId);
      
      if (isTyping) {
        // When setting typing status, use set with merge option to avoid overwriting
        await setDoc(typingRef, {
          userId,
          type: typeValue,
          contextId,
          messageType: params.messageType || 'unknown',
          isTyping: true,
          timestamp: serverTimestamp()
        }, { merge: true });
      } else {
        // When clearing typing status, we'll try to delete but catch errors silently
        try {
          await deleteDoc(typingRef);
        } catch (deleteError) {
          // Just log, don't throw - we don't want to break UI flow on this
          console.log('No typing status to delete:', deleteError.message);
        }
      }
    } catch (error) {
      // Just log, don't throw - typing status errors should never crash the app
      console.log('Error setting typing status (non-critical):', error.message);
    }
  }

  static subscribeToMessages(params, callback) {
    console.log('Subscribing to messages with params:', params);
    let messageQuery;

    if (params.type === 'course') {
      if (params.messageType === MessageTypes.COURSE_BROADCAST) {
        messageQuery = query(
          collection(db, 'messages'),
          where('courseId', '==', params.courseId),
          where('type', '==', MessageTypes.COURSE_BROADCAST),
          orderBy('timestamp', 'desc'),
          limit(INITIAL_MESSAGES_LIMIT)
        );
      } else {
        messageQuery = query(
          collection(db, 'messages'),
          where('courseId', '==', params.courseId),
          where('type', '==', params.messageType || MessageTypes.COURSE_DISCUSSION),
          orderBy('timestamp', 'desc'),
          limit(INITIAL_MESSAGES_LIMIT)
        );
      }
    } 
    else if (params.type === 'trip') {
      if (params.messageType === MessageTypes.TRIP_BROADCAST) {
        messageQuery = query(
          collection(db, 'messages'),
          where('tripId', '==', params.tripId),
          where('type', '==', MessageTypes.TRIP_BROADCAST),
          orderBy('timestamp', 'desc'),
          limit(INITIAL_MESSAGES_LIMIT)
        );
      } else {
        messageQuery = query(
          collection(db, 'messages'),
          where('tripId', '==', params.tripId),
          where('type', '==', params.messageType || MessageTypes.TRIP_DISCUSSION),
          orderBy('timestamp', 'desc'),
          limit(INITIAL_MESSAGES_LIMIT)
        );
      }
    } 
    else {
      messageQuery = query(
        collection(db, 'messages'),
        where('chatId', '==', params.chatId),
        where('type', '==', MessageTypes.CHAT),
        orderBy('timestamp', 'desc'),
        limit(INITIAL_MESSAGES_LIMIT)
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
        }).reverse(); // Reverse to maintain ascending order for display
        
        callback({ 
          messages,
          hasMore: snapshot.docs.length === INITIAL_MESSAGES_LIMIT
        });
      },
      (error) => {
        console.error('Error in message subscription:', error);
        callback({ error: 'Failed to load messages' });
      }
    );
  }

  static async getBuddies(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }
      
      const buddyList = userDoc.data().buddyList || {};
      
      // Return only accepted buddies
      return Object.entries(buddyList)
        .filter(([_, data]) => data.status === 'accepted')
        .map(([buddyId, _]) => buddyId);
    } catch (error) {
      console.error('Error getting buddies:', error);
      return [];
    }
  }

  static async editMessage(messageId, newText, userId) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (!messageSnap.exists()) {
        throw new Error('Message not found');
      }
  
      const messageData = messageSnap.data();
  
      // Verify sender is editing their own message
      if (messageData.senderId !== userId) {
        throw new Error('Not authorized to edit this message');
      }
  
      // Save edit history
      const editHistory = messageData.editHistory || [];
      editHistory.push({
        previousText: messageData.text,
        editedAt: new Date(),
        editedBy: userId
      });
  
      // Update message
      await updateDoc(messageRef, {
        text: newText,
        editHistory,
        lastEditedAt: serverTimestamp(),
        isEdited: true
      });
  
      return {
        ...messageData,
        text: newText,
        editHistory,
        lastEditedAt: new Date(),
        isEdited: true
      };
    } catch (error) {
      console.error('Error editing message:', error);
      throw new Error('Failed to edit message');
    }
  }

  static async updateMessage(messageId, updates) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, updates);
      
      const updatedDoc = await getDoc(messageRef);
      return {
        id: messageId,
        ...updatedDoc.data(),
        timestamp: updatedDoc.data().timestamp?.toDate() || new Date()
      };
    } catch (error) {
      console.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }
  
  // Add this method to check if a message is editable
  static isMessageEditable(message, userId) {
    // Can only edit your own messages
    if (message.senderId !== userId) return false;
  
    // Can't edit broadcast messages
    if (message.type?.includes('broadcast')) return false;
  
    // Can't edit deleted messages
    if (message.deletedFor?.includes(userId)) return false;
  
    // Optional: Add time limit for editing (e.g., 24 hours)
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const messageTime = message.timestamp?.toDate?.() || message.timestamp;
    if (Date.now() - messageTime > editTimeLimit) return false;
  
    return true;
  }

  static async checkBuddyStatus(userId1, userId2) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId1));
      if (!userDoc.exists()) {
        return false;
      }

      const buddyList = userDoc.data().buddyList || {};
      const buddyData = buddyList[userId2];

      return buddyData && buddyData.status === 'accepted';
    } catch (error) {
      console.error('Error checking buddy status:', error);
      return false;
    }
  }

  static async getOrCreateBuddyChat(userId1, userId2) {
    try {
      // First verify they are actually buddies
      const areBuddies = await this.checkBuddyStatus(userId1, userId2);
      if (!areBuddies) {
        throw new Error('Users must be buddies to create a chat');
      }
  
      // Get user names with better fallbacks
      const [user1Doc, user2Doc, profile1Doc, profile2Doc] = await Promise.all([
        getDoc(doc(db, 'users', userId1)),
        getDoc(doc(db, 'users', userId2)),
        getDoc(doc(db, 'profiles', userId1)),
        getDoc(doc(db, 'profiles', userId2))
      ]);
  
      // Use proper fallback logic for user1
      let user1Name = 'Unknown User';
      if (profile1Doc.exists() && profile1Doc.data().name) {
        user1Name = profile1Doc.data().name;
      } else if (user1Doc.exists() && user1Doc.data().displayName) {
        user1Name = user1Doc.data().displayName;
      }
  
      // Use proper fallback logic for user2
      let user2Name = 'Unknown User';
      if (profile2Doc.exists() && profile2Doc.data().name) {
        user2Name = profile2Doc.data().name;
      } else if (user2Doc.exists() && user2Doc.data().displayName) {
        user2Name = user2Doc.data().displayName;
      }
  
      // Check existing chats
      const chatsQuery = query(
        collection(db, 'chats'),
        where('activeParticipants', 'array-contains', userId1)
      );
      
      const chatsSnapshot = await getDocs(chatsQuery);
      const existingChat = chatsSnapshot.docs.find(doc => {
        const data = doc.data();
        return data.activeParticipants.includes(userId2) && 
               data.activeParticipants.length === 2;
      });
  
      if (existingChat) {
        return existingChat.id;
      }
  
      // Create new chat
      const chatRef = await addDoc(collection(db, 'chats'), {
        type: 'direct',
        participants: {
          [userId1]: { 
            joined: serverTimestamp(), 
            active: true,
            displayName: user1Name
          },
          [userId2]: { 
            joined: serverTimestamp(), 
            active: true,
            displayName: user2Name
          }
        },
        activeParticipants: [userId1, userId2],
        createdAt: serverTimestamp(),
        createdBy: userId1,
        lastMessageAt: serverTimestamp()
      });
  
      return chatRef.id;
    } catch (error) {
      console.error('Error creating buddy chat:', error);
      throw new Error('Failed to create buddy chat');
    }
  }

  static async sendMessage(messageData) {
    try {
      // Get sender name from multiple sources with fallbacks
      const senderProfile = await getDoc(doc(db, 'profiles', messageData.senderId));
      const userDoc = await getDoc(doc(db, 'users', messageData.senderId));
  
      let senderName = 'Unknown User';
      if (senderProfile.exists() && senderProfile.data().name) {
        senderName = senderProfile.data().name;
      } else if (userDoc.exists() && userDoc.data().displayName) {
        senderName = userDoc.data().displayName;
      } else if (messageData.senderName) {
        senderName = messageData.senderName;
      }
  
      const baseMessage = {
        timestamp: serverTimestamp(),
        readBy: [messageData.senderId],
        deletedFor: [],
        senderName
      };
  
      // Handle Trip Messages
      if (messageData.tripId) {
        const tripDoc = await getDoc(doc(db, 'trips', messageData.tripId));
        if (!tripDoc.exists()) {
          throw new Error('Trip not found');
        }
      
        const tripData = tripDoc.data();
        const isTripLeader = tripData.instructorId === messageData.senderId;
        const isTripParticipant = tripData.participants?.some(p => p.uid === messageData.senderId);
      
        if (messageData.type === MessageTypes.TRIP_BROADCAST && !isTripLeader) {
          throw new Error('Only trip leaders can send broadcast messages');
        }
        
        if (!isTripLeader && !isTripParticipant) {
          throw new Error('Not authorized to send messages in this trip');
        }
      
        if (messageData.type === MessageTypes.TRIP_PRIVATE) {
          // THIS IS THE FIX - Using instructorId instead of leaderId
          const isLeaderInvolved = isTripLeader || messageData.recipientId === tripData.instructorId;
          if (!isLeaderInvolved) {
            const areBuddies = await this.checkBuddyStatus(messageData.senderId, messageData.recipientId);
            if (areBuddies) {
              const chatId = await this.getOrCreateBuddyChat(messageData.senderId, messageData.recipientId);
              return this.sendMessage({
                ...messageData,
                type: MessageTypes.CHAT,
                chatId,
                tripId: null
              });
            }
            throw new Error('Participants can only message trip leaders directly');
          }
        }
      
        const newMessage = {
          ...baseMessage,
          ...messageData
        };

          // NEW CODE: Add safety check for allowedReaders on ALL trip message types
        if (!newMessage.allowedReaders && (
          newMessage.type === MessageTypes.TRIP_DISCUSSION || 
          newMessage.type === MessageTypes.TRIP_BROADCAST ||
          newMessage.type === MessageTypes.TRIP_PRIVATE
        )) {
          // Get all participants UIDs
          const participantUids = tripData.participants?.map(p => p.uid) || [];
          
          // Add allowedReaders property
          newMessage.allowedReaders = [
            newMessage.senderId,         // The sender can read it
            tripData.instructorId,       // The instructor can read it
            ...participantUids           // All participants can read it
          ];
          
          // Remove any duplicates
          newMessage.allowedReaders = [...new Set(newMessage.allowedReaders)];
          
          console.log('Added allowedReaders to trip message:', newMessage.type, newMessage.allowedReaders);
        }
      
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
        console.log('Message added with ID:', messageRef.id);

        let recipients = [];

        if (messageData.type === MessageTypes.TRIP_BROADCAST) {
          recipients = tripData.participants?.map(p => p.uid) || [];
        }
        else if (messageData.type === MessageTypes.TRIP_DISCUSSION) {
          recipients = tripData.participants?.map(p => p.uid) || [];
          recipients = recipients.filter(id => id !== messageData.senderId);
        } 
        else if (messageData.recipientId) {
          recipients = [messageData.recipientId];
        }

        // ADD THIS DEBUGGING CODE RIGHT HERE
        console.log('Creating trip message notifications:', {
          messageType: messageData.type,
          senderId: messageData.senderId,
          tripId: messageData.tripId,
          recipientsCount: recipients.length,
          recipients: recipients
        });

        await Promise.all(recipients.map(recipientId => 
          NotificationService.createMessageNotification({
            id: messageRef.id,
            type: messageData.type,
            senderId: messageData.senderId,
            senderName,
            text: messageData.text,
            tripId: messageData.tripId,
            tripName: tripData.name || tripData.location
          }, recipientId)
        ));

        return { id: messageRef.id, ...newMessage };
      }
      // Handle Course Messages
      else if (messageData.courseId) {
        const courseDoc = await getDoc(doc(db, 'courses', messageData.courseId));
        if (!courseDoc.exists()) {
          throw new Error('Course not found');
        }
  
        const courseData = courseDoc.data();
        const isInstructor = courseData.instructorId === messageData.senderId;
        const isAssistant = courseData.assistants?.some(a => a.uid === messageData.senderId);
        const isStudent = courseData.students?.some(s => s.uid === messageData.senderId);
  
        if (messageData.type === MessageTypes.COURSE_BROADCAST && !isInstructor) {
          throw new Error('Only instructors can send broadcast messages');
        }
  
        if (!isInstructor && !isAssistant && !isStudent) {
          throw new Error('Not authorized to send messages in this course');
        }
  
        if (messageData.type === MessageTypes.COURSE_PRIVATE) {
          const isInstructorInvolved = isInstructor || messageData.recipientId === courseData.instructorId;
          if (!isInstructorInvolved) {
            const areBuddies = await this.checkBuddyStatus(messageData.senderId, messageData.recipientId);
            if (areBuddies) {
              const chatId = await this.getOrCreateBuddyChat(messageData.senderId, messageData.recipientId);
              return this.sendMessage({
                ...messageData,
                type: MessageTypes.CHAT,
                chatId,
                courseId: null
              });
            }
            throw new Error('Students can only message instructors directly');
          }
        }
  
        const newMessage = {
          ...baseMessage,
          ...messageData
        };
  
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
  
        let recipients = [];
  
        if (messageData.type === MessageTypes.COURSE_BROADCAST) {
          recipients = [
            ...(courseData.students?.map(s => s.uid) || []),
            ...(courseData.assistants?.map(a => a.uid) || [])
          ];
        }
        else if (messageData.type === MessageTypes.COURSE_DISCUSSION) {
          recipients = [
            ...(courseData.students?.map(s => s.uid) || []),
            ...(courseData.assistants?.map(a => a.uid) || [])
          ].filter(id => id !== messageData.senderId);
        } 
        else if (messageData.recipientId) {
          recipients = [messageData.recipientId];
        }
  
        await Promise.all(recipients.map(recipientId => 
          NotificationService.createMessageNotification({
            id: messageRef.id,
            type: messageData.type,
            senderId: messageData.senderId,
            senderName,
            text: messageData.text,
            courseId: messageData.courseId,
            courseName: courseData.name
          }, recipientId)
        ));
  
        return { id: messageRef.id, ...newMessage };
      } 
      // Handle Buddy Chat Messages
      else {
        console.log('MessageService - Checking Chat:', messageData.chatId);
        const chatDoc = await getDoc(doc(db, 'chats', messageData.chatId));
        if (!chatDoc.exists()) {
          throw new Error('Chat not found');
        }
        
        const chatData = chatDoc.data();
  
        // Verify sender is part of the chat
        if (!chatData.activeParticipants.includes(messageData.senderId)) {
          throw new Error('Not authorized to send messages in this chat');
        }
  
        // For buddy chats, verify all participants are buddies
        if (chatData.type === 'buddy') {
          const buddies = await this.getBuddies(messageData.senderId);
          const otherParticipants = chatData.activeParticipants.filter(id => id !== messageData.senderId);
          const allAreBuddies = otherParticipants.every(id => buddies.includes(id));
          if (!allAreBuddies) {
            throw new Error('Can only chat with buddies');
          }
        }
  
        const newMessage = {
          ...baseMessage,
          ...messageData,
          type: MessageTypes.CHAT
        };
  
        const messageRef = await addDoc(collection(db, 'messages'), newMessage);
  
        const recipients = chatData.activeParticipants
          .filter(id => id !== messageData.senderId);
  
        // Send notifications
        await Promise.all(recipients.map(recipientId => 
          NotificationService.createMessageNotification({
            id: messageRef.id,
            type: MessageTypes.CHAT,
            senderId: messageData.senderId,
            senderName,
            text: messageData.text,
            chatId: messageData.chatId
          }, recipientId)
        ));
  
        // Update chat metadata
        await updateDoc(doc(db, 'chats', messageData.chatId), {
          lastMessageAt: serverTimestamp(),
          lastMessage: {
            text: messageData.text,
            senderId: messageData.senderId,
            senderName
          }
        });
  
        return { id: messageRef.id, ...newMessage };
      }
    } catch (error) {
      console.error('MessageService - Detailed error:', error);
      console.error('MessageService - Error stack:', error.stack);
      throw new Error('Failed to send message');
    }
  }

  static async markAsRead(messageId, userId, isBroadcast = false) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      if (isBroadcast) {
        const messageDoc = await getDoc(messageRef);
        const messageData = messageDoc.data();
        
        if (!messageData.readStatus?.[userId]?.read) {
          await updateDoc(messageRef, {
            [`readStatus.${userId}`]: {
              read: true,
              readAt: serverTimestamp()
            },
            readCount: (messageData.readCount || 0) + 1,
            readBy: arrayUnion(userId)
          });
        }
      } else {
        await updateDoc(messageRef, {
          readBy: arrayUnion(userId)
        });
      }
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

  static async searchMessages(params) {
    try {
      let baseQuery;
      const searchLimit = 50; // Limit search results
      
      // Build base query depending on context (course/trip)
      if (params.type === 'course') {
        baseQuery = query(
          collection(db, 'messages'),
          where('courseId', '==', params.courseId),
          where('type', '==', params.messageType),
          orderBy('text'),  // Need to order by field we're searching
          orderBy('timestamp', 'desc'),
          limit(searchLimit)
        );
      } else if (params.type === 'trip') {
        baseQuery = query(
          collection(db, 'messages'),
          where('tripId', '==', params.tripId),
          where('type', '==', params.messageType),
          orderBy('text'),
          orderBy('timestamp', 'desc'),
          limit(searchLimit)
        );
      } else {
        baseQuery = query(
          collection(db, 'messages'),
          where('chatId', '==', params.chatId),
          where('type', '==', MessageTypes.CHAT),
          orderBy('text'),
          orderBy('timestamp', 'desc'),
          limit(searchLimit)
        );
      }
  
      // Get all messages that match the base query
      const snapshot = await getDocs(baseQuery);
      
      // Client-side filtering for text search
      const searchResults = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }))
        .filter(message => {
          const searchText = params.searchText.toLowerCase();
          const messageText = message.text.toLowerCase();
          const senderName = message.senderName.toLowerCase();
          
          // Search in message text and sender name
          return messageText.includes(searchText) || 
                 senderName.includes(searchText);
        })
        .filter(message => {
          // Filter out messages the user has deleted
          return !message.deletedFor?.includes(params.userId);
        });
  
      return {
        messages: searchResults,
        hasMore: searchResults.length === searchLimit
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      throw new Error('Failed to search messages');
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
        // If no participants left, delete the chat and all its messages
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
        // Otherwise just remove the user from participants
        batch.update(chatRef, {
          activeParticipants: updatedParticipants
        });

        // Mark all messages as deleted for this user
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