export const MessageTypes = {
    // Buddy-to-buddy messaging
    CHAT: 'chat',                     // Regular chat between buddies
    
    // Course messaging
    COURSE_DISCUSSION: 'course_discussion',  // Group chat for everyone in course
    COURSE_PRIVATE: 'course_private',        // Student/Assistant -> Instructor or vice versa
    COURSE_BROADCAST: 'course_broadcast',    // Instructor announcements to all
    
    // Trip messaging
    TRIP_DISCUSSION: 'trip_discussion',      // Group chat for everyone in trip
    TRIP_PRIVATE: 'trip_private',            // Participant -> Trip leader or vice versa
    TRIP_BROADCAST: 'trip_broadcast'         // Trip leader announcements to all
  };