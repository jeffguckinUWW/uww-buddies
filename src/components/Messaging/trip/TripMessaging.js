// src/components/Messaging/trip/TripMessaging.js

import React from 'react';
import UnifiedMessaging from '../shared/UnifiedMessaging';

const TripMessaging = ({ 
  trip, 
  isOpen, 
  onClose, 
  defaultView = 'discussion' 
}) => {
  return (
    <UnifiedMessaging
      context={trip}
      contextType="trip"
      isOpen={isOpen}
      onClose={onClose}
      defaultTab={defaultView}
    />
  );
};

export default TripMessaging;