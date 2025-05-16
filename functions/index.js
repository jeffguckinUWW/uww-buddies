/* eslint-disable */
/**
 * UWW Buddies - Push Notification Functions
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Listen for new notifications being created in the database
exports.sendPushNotification = onDocumentCreated("notifications/{notificationId}", async (event) => {
  try {
    // Get the notification data
    const notification = event.data.data();
    logger.info("New notification created:", notification);
    
    // If notification is already marked as read, don't send a push
    if (notification.read === true) {
      logger.info("Notification already read, skipping push notification");
      return null;
    }
    
    // Get recipient user ID
    const userId = notification.toUser;
    if (!userId) {
      logger.error("No recipient user ID found in notification");
      return null;
    }
    
    // Get the user's push tokens from their profile
    const userSnapshot = await admin.firestore().collection("users").doc(userId).get();
    if (!userSnapshot.exists) {
      logger.error("User not found:", userId);
      return null;
    }
    
    const userData = userSnapshot.data();
    const pushTokens = userData.pushTokens || [];
    
    if (pushTokens.length === 0) {
      logger.info("No push tokens found for user:", userId);
      return null;
    }
    
    // Create notification title and body based on notification type
    let title = "UWW Buddies";
    let body = "You have a new notification";
    
    // Customize the notification message based on type
    if (notification.type === "new_message") {
      title = `New Message from ${notification.fromUserName || "Someone"}`;
      body = notification.messagePreview || "You received a new message";
    } else if (notification.type === "buddy_request") {
      title = "New Buddy Request";
      body = `${notification.fromUserName || "Someone"} wants to be your buddy`;
    } else if (notification.type?.startsWith("course_")) {
      title = `Training Update: ${notification.courseName || ""}`;
      if (notification.type === "course_broadcast") {
        body = `Announcement from your instructor: ${notification.messagePreview || ""}`;
      } else if (notification.type === "course_message") {
        body = `New message in class discussion: ${notification.messagePreview || ""}`;
      } else if (notification.type === "course_direct") {
        body = `Direct message from ${notification.fromUserName || "Someone"}: ${notification.messagePreview || ""}`;
      }
    } else if (notification.type?.startsWith("trip_")) {
      title = `Trip Update: ${notification.tripName || ""}`;
      if (notification.type === "trip_broadcast") {
        body = `Announcement for your trip: ${notification.messagePreview || ""}`;
      } else if (notification.type === "trip_message") {
        body = `New message in trip discussion: ${notification.messagePreview || ""}`;
      } else if (notification.type === "trip_direct") {
        body = `Direct message from ${notification.fromUserName || "Someone"}: ${notification.messagePreview || ""}`;
      }
    }
    
    // Build the push notification message
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        notificationId: event.params.notificationId,
        type: notification.type || "",
        targetRoute: notification.targetRoute || "",
        fromUser: notification.fromUser || "",
        fromUserName: notification.fromUserName || "",
        chatId: notification.chatId || "",
        courseId: notification.courseId || "",
        tripId: notification.tripId || ""
      },
      tokens: pushTokens,
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1
          }
        }
      }
    };
    
    // Send the messages
    logger.info("Sending push notification to tokens:", pushTokens);
    
    const response = await admin.messaging().sendMulticast(message);
    logger.info("Push notification sent successfully:", response);
    
    if (response.failureCount > 0) {
      // If some pushes failed, clean up the bad tokens
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(pushTokens[idx]);
        }
      });
      
      logger.warn("Push notification failed for some tokens:", failedTokens);
      
      // If there are any invalid tokens, remove them from the user's profile
      if (failedTokens.length > 0) {
        const validTokens = pushTokens.filter(token => !failedTokens.includes(token));
        
        await admin.firestore().collection("users").doc(userId).update({
          pushTokens: validTokens
        });
        
        logger.info("Removed invalid push tokens from user profile");
      }
    }
    
    return {success: true, sent: response.successCount};
    
  } catch (error) {
    logger.error("Error sending push notification:", error);
    return null;
  }
});