// src/services/NotificationService.js
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
  getDocs,
  increment,
  getDoc,
  writeBatch,
  setDoc,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { MessageTypes } from './MessageConstants';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

class NotificationService {
  // Create a notification in the database
  static async createNotification(data) {
    try {
      console.log('Creating notification with data:', data);
      
      // Filter out undefined values
      const cleanData = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined) {
          cleanData[key] = data[key];
        }
      });
      
      const notificationData = {
        ...cleanData,
        timestamp: serverTimestamp(),
        read: false
      };
      
      // Check if a similar notification already exists and is unread
      // This prevents duplicate notifications for the same message
      let existingQuery;

      if (data.messageId) {
        // For message-based notifications
        existingQuery = query(
          collection(db, 'notifications'),
          where('toUser', '==', data.toUser),
          where('read', '==', false),
          where('messageId', '==', data.messageId),
          limit(1)
        );
      } else if (data.requestId) {
        // For buddy requests
        existingQuery = query(
          collection(db, 'notifications'),
          where('toUser', '==', data.toUser),
          where('read', '==', false),
          where('requestId', '==', data.requestId),
          limit(1)
        );
      } else {
        // For other types of notifications with no specific ID
        existingQuery = query(
          collection(db, 'notifications'),
          where('toUser', '==', data.toUser),
          where('read', '==', false),
          where('type', '==', data.type),
          limit(1)
        );
      }
      
      const existingDocs = await getDocs(existingQuery);
      if (!existingDocs.empty) {
        // If similar notification exists, don't create a new one
        console.log('Similar notification already exists, skipping creation');
        return existingDocs.docs[0].id;
      }
      
      const docRef = await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Notification document created with ID:', docRef.id);
      
      // Also update the unread counters collection to track unread counts by category
      await this.incrementUnreadCounters(data);
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }
  
  // Handle different notification types and create appropriate notifications
  static async createMessageNotification(messageData, recipientId) {
    try {
      console.log('NotificationService.createMessageNotification called with:', {
        messageData,
        recipientId
      });
      
      const { senderId, senderName, text, type, courseId, courseName, tripId, tripName, chatId, id } = messageData;
      
      // Skip if sender is recipient
      if (senderId === recipientId) {
        console.log('Skipping notification - sender is recipient');
        return;
      }
      
      let notificationType;
      let targetRoute;
      let isInstructorNotification = false;
      
      // Determine notification type and route based on message type
      if (type.startsWith('course_')) {
        // Check if recipient is the course instructor
        try {
          const courseRef = doc(db, 'courses', courseId);
          const courseSnap = await getDoc(courseRef);
          
          if (courseSnap.exists()) {
            const courseData = courseSnap.data();
            isInstructorNotification = courseData.instructorId === recipientId;
            
            // Set appropriate target route
            if (isInstructorNotification) {
              targetRoute = `/instructor`;
            } else {
              targetRoute = `/training?courseId=${courseId}`;
            }
          }
        } catch (err) {
          console.error('Error checking if recipient is course instructor:', err);
        }
        
        if (type === MessageTypes.COURSE_BROADCAST) {
          notificationType = 'course_broadcast';
        } else if (type === MessageTypes.COURSE_DISCUSSION) {
          notificationType = 'course_message';
        } else if (type === MessageTypes.COURSE_PRIVATE) {
          notificationType = 'course_direct';
        }
      } else if (type.startsWith('trip_')) {
        // Check if recipient is the trip instructor/leader
        try {
          const tripRef = doc(db, 'trips', tripId);
          const tripSnap = await getDoc(tripRef);
          
          if (tripSnap.exists()) {
            const tripData = tripSnap.data();
            isInstructorNotification = tripData.instructorId === recipientId;
            
            // Set appropriate target route
            if (isInstructorNotification) {
              targetRoute = `/instructor`;
            } else {
              targetRoute = `/travel?tripId=${tripId}`;
            }
          }
        } catch (err) {
          console.error('Error checking if recipient is trip instructor:', err);
        }
        
        if (type === MessageTypes.TRIP_BROADCAST) {
          notificationType = 'trip_broadcast';
        } else if (type === MessageTypes.TRIP_DISCUSSION) {
          notificationType = 'trip_message';
        } else if (type === MessageTypes.TRIP_PRIVATE) {
          notificationType = 'trip_direct';
        }
        
        console.log('Creating trip notification:', {
          tripId: tripId,
          originalType: type,
          notificationType: notificationType, 
          recipientId: recipientId,
          senderId: senderId,
          isInstructorNotification: isInstructorNotification
        });
      } else if (type === MessageTypes.CHAT) {
        notificationType = 'new_message';
        targetRoute = `/messages/${chatId}`;
      }
      
      console.log('Determined notification type:', {
        originalType: type,
        mappedType: notificationType,
        targetRoute,
        isInstructorNotification
      });
      
      if (!notificationType) {
        console.warn('Could not determine notification type for:', type);
        return;
      }
      
      // Create a clean notification object without undefined values
      const notificationData = {
        type: notificationType,
        fromUser: senderId,
        fromUserName: senderName,
        toUser: recipientId,
        messageId: id,
        messagePreview: text && text.length > 100 ? `${text.substring(0, 100)}...` : text,
        targetRoute,
        timestamp: serverTimestamp(),
        urgent: type === MessageTypes.COURSE_BROADCAST || type === MessageTypes.TRIP_BROADCAST,
        isInstructorNotification: isInstructorNotification
      };
      
      // Only add these fields if they are defined
      if (chatId) notificationData.chatId = chatId;
      if (courseId) notificationData.courseId = courseId;
      if (courseName) notificationData.courseName = courseName;
      if (tripId) notificationData.tripId = tripId;
      if (tripName) notificationData.tripName = tripName;
      
      console.log('Creating notification with data:', notificationData);
      
      try {
        await this.createNotification(notificationData);
        console.log('Notification created successfully');
      } catch (error) {
        console.error('Error in createNotification:', error);
      }
    } catch (error) {
      console.error('Error creating message notification:', error);
    }
  }
  
  // Create a buddy request notification
  static async createBuddyRequestNotification(requestData) {
    try {
      const { fromUser, fromUserName, toUser, requestId } = requestData;
      
      const notificationData = {
        type: 'buddy_request',
        fromUser,
        fromUserName,
        toUser,
        requestId,
        targetRoute: '/buddies/requests',
        read: false
      };
      
      await this.createNotification(notificationData);
      console.log("Buddy request notification created successfully");
    } catch (error) {
      console.error('Error creating buddy request notification:', error);
    }
  }
  
  // Track unread counts by category (messages, courses, trips)
  static async incrementUnreadCounters(notificationData) {
    try {
      const { toUser, type, isInstructorNotification } = notificationData;
      console.log('Incrementing unread counters for user:', toUser);
      
      const countersRef = doc(db, 'unreadCounters', toUser);
      
      // Get current counters or create if doesn't exist
      const counterDoc = await getDoc(countersRef);
      if (!counterDoc.exists()) {
        await setDoc(countersRef, {
          messages: 0,
          training: 0,
          travel: 0,
          buddies: 0,
          instructor: 0,
          total: 0
        });
      }
      
      // Update appropriate counter based on notification type
      let counterField = null;
      
      // Route notifications to instructor category if flag is set
      if (isInstructorNotification) {
        counterField = 'instructor';
      } else if (type === 'new_message') {
        counterField = 'messages';
      } else if (type.startsWith('course_')) {
        counterField = 'training';
      } else if (type.startsWith('trip_')) {
        counterField = 'travel';
      } else if (type === 'buddy_request') {
        counterField = 'buddies';
      }
      
      console.log('Counter updates:', {
        type: type,
        categoryUpdated: counterField,
        increment: 1,
        isInstructorNotification: isInstructorNotification
      });
      
      console.log('Notification data for counter increment:', {
        toUser: toUser,
        type: type,
        counterField: counterField,
        tripId: notificationData.tripId,
        courseId: notificationData.courseId,
        chatId: notificationData.chatId,
        fromUser: notificationData.fromUser,
        isInstructorNotification: isInstructorNotification
      });
      
      if (counterField) {
        console.log(`Incrementing ${counterField} counter for user ${toUser}`);
        await updateDoc(countersRef, {
          [counterField]: increment(1),
          total: increment(1)
        });
      }
    } catch (error) {
      console.error('Error incrementing unread counters:', error);
    }
  }
  
  // Subscribe to unread counter updates
  static subscribeToUnreadCounters(userId, callback) {
    if (!userId) return () => {};
    
    const countersRef = doc(db, 'unreadCounters', userId);
    
    return onSnapshot(countersRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data());
      } else {
        callback({
          messages: 0,
          training: 0,
          travel: 0,
          buddies: 0,
          instructor: 0,
          total: 0
        });
      }
    }, (error) => {
      console.error('Error subscribing to unread counters:', error);
      callback({
        messages: 0,
        training: 0,
        travel: 0,
        buddies: 0,
        instructor: 0,
        total: 0,
        error: true
      });
    });
  }
  
  // Get unread counts for a specific category (used to show badge on tabs)
  static async getUnreadCountsForCategory(userId, category, itemId) {
    try {
      // For specific items (courses, trips, chats), count unread notifications
      const q = query(
        collection(db, 'notifications'),
        where('toUser', '==', userId),
        where('read', '==', false),
        where(category + 'Id', '==', itemId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread counts for category:', error);
      return 0;
    }
  }
  
  // Subscribe to notifications for a specific category/item
  static subscribeToItemNotifications(userId, itemType, itemId, callback) {
    if (!userId || !itemId) return () => {};
    
    const field = `${itemType}Id`;
    
    const q = query(
      collection(db, 'notifications'),
      where('toUser', '==', userId),
      where('read', '==', false),
      where(field, '==', itemId),
      orderBy('timestamp', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      
      // Group notifications by type to show badges on tabs
      const tabCounts = {
        broadcast: notifications.filter(n => n.type.includes('broadcast')).length,
        discussion: notifications.filter(n => (
          n.type.includes('message') && !n.type.includes('direct')
        )).length,
        direct: notifications.filter(n => n.type.includes('direct')).length
      };
      
      callback({
        notifications,
        tabCounts,
        totalCount: notifications.length
      });
    }, (error) => {
      console.error(`Error subscribing to ${itemType} notifications:`, error);
      callback({
        notifications: [],
        tabCounts: { broadcast: 0, discussion: 0, direct: 0 },
        totalCount: 0,
        error: true
      });
    });
  }
  
  // Mark all notifications as read for a specific tab - THIS IS THE UPDATED METHOD
  static async markTabNotificationsAsRead(userId, itemType, itemId, tabType) {
    try {
      const batch = writeBatch(db);
      const countersRef = doc(db, 'unreadCounters', userId);
      
      // Get current counter values before updating
      const counterDoc = await getDoc(countersRef);
      const currentCounters = counterDoc.exists() ? counterDoc.data() : {
        messages: 0,
        training: 0,
        travel: 0,
        buddies: 0,
        instructor: 0,
        total: 0
      };
      
      // Get all unread notifications for this tab
      const field = `${itemType}Id`;
      
      let typeConditions = [];
      if (tabType === 'broadcast') {
        typeConditions = ['course_broadcast', 'trip_broadcast'];
      } else if (tabType === 'discussion') {
        typeConditions = ['course_message', 'trip_message'];
      } else if (tabType === 'direct' || tabType === 'private') {
        // CHANGE: Accept both 'direct' and 'private' as valid terms
        typeConditions = ['course_direct', 'trip_direct', 'course_private', 'trip_private'];
        
        // Add debugging log
        console.log(`Processing ${tabType} tab notifications for ${itemType} ${itemId}`);
      } else if (tabType === 'chat') {
        typeConditions = ['new_message'];
      }
      
      // Add debugging log to see what conditions are being used
      console.log(`Looking for notifications of types:`, typeConditions);
      
      // Get the notifications
      const q = query(
        collection(db, 'notifications'),
        where('toUser', '==', userId),
        where('read', '==', false),
        where(field, '==', itemId),
        where('type', 'in', typeConditions)
      );
      
      const snapshot = await getDocs(q);
      
      // Add debugging log to see what was found
      console.log(`Found ${snapshot.size} notifications to mark as read`);
      if (snapshot.size > 0) {
        console.log('First notification type:', snapshot.docs[0].data().type);
      }
      
      // Mark each notification as read
      let count = 0;
      let instructorCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        batch.update(doc.ref, { read: true });
        count++;
        
        // Count instructor notifications separately
        if (data.isInstructorNotification) {
          instructorCount++;
        }
      });
      
      console.log(`Marking ${count} ${tabType} notifications as read for ${itemType} ${itemId}`);
      
      // Update counters
      let counterField = '';
      if (itemType === 'course') {
        counterField = 'training';
      } else if (itemType === 'trip') {
        counterField = 'travel';
      } else if (itemType === 'chat') {
        counterField = 'messages';
      } else if (itemType === 'buddy' || tabType === 'buddy_request') {
        counterField = 'buddies';
      }
      
      if (counterField && count > 0) {
        // Get current value for this counter
        const currentCounterValue = currentCounters[counterField] || 0;
        
        // Calculate safe decrement value (don't go below zero)
        const safeDecrement = Math.min(count - instructorCount, Math.max(0, currentCounterValue));
        
        console.log(`Decrementing ${counterField} counter by ${safeDecrement} (from ${currentCounterValue})`);
        
        if (safeDecrement > 0) {
          // Decrement the appropriate counter by the safe amount
          batch.update(countersRef, {
            [counterField]: increment(-safeDecrement),
            total: increment(-safeDecrement)
          });
        }
      }
      
      // Handle instructor notifications
      if (instructorCount > 0) {
        const currentInstructorValue = currentCounters.instructor || 0;
        const safeInstructorDecrement = Math.min(instructorCount, Math.max(0, currentInstructorValue));
        
        console.log(`Decrementing instructor counter by ${safeInstructorDecrement} (from ${currentInstructorValue})`);
        
        if (safeInstructorDecrement > 0) {
          batch.update(countersRef, {
            instructor: increment(-safeInstructorDecrement),
            total: increment(-safeInstructorDecrement)
          });
        }
      }
      
      await batch.commit();
      return count;
    } catch (error) {
      console.error('Error marking tab notifications as read:', error);
      return 0;
    }
  }
  
  // Mark all instructor notifications as read
  static async clearInstructorNotifications(userId) {
    try {
      const batch = writeBatch(db);
      const countersRef = doc(db, 'unreadCounters', userId);
      
      // Get all unread instructor notifications
      const q = query(
        collection(db, 'notifications'),
        where('toUser', '==', userId),
        where('read', '==', false),
        where('isInstructorNotification', '==', true)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Found ${snapshot.size} instructor notifications to mark as read`);
      
      // Mark each notification as read
      snapshot.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      // Get current counter values
      const counterDoc = await getDoc(countersRef);
      if (counterDoc.exists()) {
        const currentCounters = counterDoc.data();
        const instructorCount = currentCounters.instructor || 0;
        
        if (instructorCount > 0) {
          batch.update(countersRef, {
            instructor: 0,
            total: increment(-instructorCount)
          });
        }
      }
      
      await batch.commit();
      return snapshot.size;
    } catch (error) {
      console.error('Error clearing instructor notifications:', error);
      return 0;
    }
  }
  
  // Mark one notification as read
  static async markNotificationAsRead(notificationId, userId) {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      const notificationDoc = await getDoc(notificationRef);
      
      if (!notificationDoc.exists() || notificationDoc.data().read) {
        return; // Already read or doesn't exist
      }
      
      const notificationData = notificationDoc.data();
      
      // Update notification
      await updateDoc(notificationRef, { read: true });
      
      // Update counter
      const countersRef = doc(db, 'unreadCounters', userId);
      
      // Get current counter values before updating
      const counterDoc = await getDoc(countersRef);
      const currentCounters = counterDoc.exists() ? counterDoc.data() : {
        messages: 0,
        training: 0,
        travel: 0,
        buddies: 0,
        instructor: 0,
        total: 0
      };
      
      // Determine which counter to decrement
      let counterField = '';
      if (notificationData.isInstructorNotification) {
        counterField = 'instructor';
      } else if (notificationData.type === 'new_message') {
        counterField = 'messages';
      } else if (notificationData.type.startsWith('course_')) {
        counterField = 'training';
      } else if (notificationData.type.startsWith('trip_')) {
        counterField = 'travel';
      } else if (notificationData.type === 'buddy_request') {
        counterField = 'buddies';
      }
      
      if (counterField) {
        // Make sure we don't decrement below zero
        const currentValue = currentCounters[counterField] || 0;
        if (currentValue > 0) {
          await updateDoc(countersRef, {
            [counterField]: increment(-1),
            total: increment(-1)
          });
        }
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }
  
  // Clear all notifications for a user
  static async clearAllNotifications(userId) {
    try {
      const batch = writeBatch(db);
      
      // Get all unread notifications
      const q = query(
        collection(db, 'notifications'),
        where('toUser', '==', userId),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      // Mark each notification as read
      snapshot.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      // Reset counters
      const countersRef = doc(db, 'unreadCounters', userId);
      batch.update(countersRef, {
        messages: 0,
        training: 0,
        travel: 0,
        buddies: 0,
        instructor: 0,
        total: 0
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }
  
  // Fix the negative counters for a specific user
  static async resetNegativeCounters(userId) {
    try {
      const countersRef = doc(db, 'unreadCounters', userId);
      const counterDoc = await getDoc(countersRef);
      
      if (counterDoc.exists()) {
        const counters = counterDoc.data();
        const needsReset = 
          counters.messages < 0 ||
          counters.training < 0 ||
          counters.travel < 0 ||
          counters.buddies < 0 ||
          counters.instructor < 0 ||
          counters.total < 0;
        
        if (needsReset) {
          console.log(`Resetting negative counters for user ${userId}`);
          await updateDoc(countersRef, {
            messages: Math.max(0, counters.messages || 0),
            training: Math.max(0, counters.training || 0),
            travel: Math.max(0, counters.travel || 0),
            buddies: Math.max(0, counters.buddies || 0),
            instructor: Math.max(0, counters.instructor || 0),
            total: Math.max(0, counters.total || 0)
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error resetting negative counters:', error);
      return false;
    }
  }
  
  // === PUSH NOTIFICATION METHODS ===
  
  // Initialize push notifications (call this on app startup)
  static async initPushNotifications() {
    // Only proceed on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on this platform');
      return;
    }
    
    try {
      // Request permission
      const permissionStatus = await PushNotifications.requestPermissions();
      
      if (permissionStatus.receive === 'granted') {
        // Register with Apple/Google to receive push
        await PushNotifications.register();
      } else {
        console.log('Push notification permission denied');
        return;
      }
      
      // Configure push notification handlers
      this.setupPushListeners();
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  }
  
  // Set up event listeners for push notifications
  static setupPushListeners() {
    // On successful registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success:', token.value);
      // Save the token to the user's profile in Firebase
      this.savePushToken(token.value);
    });
    
    // If registration fails
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration failed:', JSON.stringify(error));
    });
    
    // When a notification is received while the app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received:', notification);
      
      // Convert push notification to an in-app notification
      this.handleReceivedPushNotification(notification);
    });
    
    // When a notification action is performed (notification clicked)
    PushNotifications.addListener('pushNotificationActionPerformed', (actionPerformed) => {
      console.log('Push notification action performed:', actionPerformed);
      
      // Handle navigation when a notification is tapped
      const notification = actionPerformed.notification;
      this.handleNotificationTap(notification);
    });
  }
  
  // Save the device token to the user's profile
  static async savePushToken(token) {
    try {
      // Get the current user ID
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log('No user logged in, cannot save push token');
        return;
      }
      
      const userId = currentUser.uid;
      
      // Save the token to the user's profile
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushTokens: arrayUnion(token),
        lastTokenUpdate: serverTimestamp()
      });
      
      console.log('Push token saved successfully');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }
  
  // Handle a received push notification when app is in foreground
  static async handleReceivedPushNotification(notification) {
    try {
      // Extract data from the notification
      const title = notification.title;
      const body = notification.body;
      const data = notification.data;
      
      // Display an alert or in-app notification
      // You could use a custom toast or alert component here
      console.log(`Push Notification: ${title} - ${body}`);
      
      // If the notification contains specific data, handle it
      if (data) {
        // For example, update in-app notification counters
        // or trigger a refresh of relevant data
      }
    } catch (error) {
      console.error('Error handling received push notification:', error);
    }
  }
  
  // Navigate when a notification is tapped
  static handleNotificationTap(notification) {
    try {
      const data = notification.data;
      
      if (!data) return;
      
      // Extract navigation information
      const targetRoute = data.targetRoute;
      
      // Navigate to the appropriate screen based on the notification type
      if (targetRoute) {
        // Navigate using your app's router/navigation system
        // For example, if using React Router:
        // window.location.href = targetRoute;
        console.log(`Should navigate to: ${targetRoute}`);
      }
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }
}

export default NotificationService;