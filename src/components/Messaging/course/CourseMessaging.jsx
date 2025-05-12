// src/components/Messaging/course/CourseMessaging.jsx

import React from 'react';
import UnifiedMessaging from '../shared/UnifiedMessaging';

const CourseMessaging = ({ 
  course, 
  isOpen, 
  onClose, 
  isTripMessaging = false,  // This is legacy and can be removed in future
  defaultView = 'discussion',
  messageRecipient = null
}) => {
  return (
    <UnifiedMessaging
      context={course}
      contextType="course"
      isOpen={isOpen}
      onClose={onClose}
      defaultTab={defaultView}
      recipient={messageRecipient}
    />
  );
};

export default CourseMessaging;