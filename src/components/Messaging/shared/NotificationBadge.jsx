// src/components/Messaging/shared/NotificationBadge.jsx
import React from 'react';
import { Bell } from 'lucide-react';

const NotificationBadge = ({ 
  count, 
  showIcon = false, 
  size = 'md', 
  className = '', 
  onClick = null,
  isSmallScreen = false 
}) => {
  if (!count || count <= 0) return null;

  // Handle different size variants
  let sizeClasses = '';
  let countDisplay = count > 9 ? '9+' : count;
  
  // Adjust for mobile if needed
  if (isSmallScreen && size === 'sm') {
    size = 'md'; // Ensure touch-friendly size on mobile
  }
  
  switch (size) {
    case 'sm':
      sizeClasses = 'w-4 h-4 text-[10px]';
      countDisplay = count > 9 ? '9+' : count;
      break;
    case 'md':
      sizeClasses = 'w-5 h-5 text-xs';
      countDisplay = count > 99 ? '99+' : count;
      break;
    case 'lg':
      sizeClasses = 'w-6 h-6 text-sm';
      countDisplay = count > 999 ? '999+' : count;
      break;
    default:
      sizeClasses = 'w-5 h-5 text-xs';
  }

  // Base Component - Badge Only
  const Badge = () => (
    <span 
      className={`bg-red-500 text-white rounded-full flex items-center justify-center ${
        sizeClasses
      } ${className} ${
        isSmallScreen && onClick ? 'touch-target' : ''
      } ${onClick ? 'no-tap-highlight' : ''}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      aria-label={onClick ? `${count} notifications` : undefined}
    >
      {countDisplay}
    </span>
  );

  // With Icon Variant
  if (showIcon) {
    return (
      <div className={`relative inline-flex ${onClick ? 'no-tap-highlight' : ''}`}>
        <Bell 
          size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} 
          className={isSmallScreen && onClick ? 'p-1' : ''}
        />
        <span className="absolute -top-1 -right-1">
          <Badge />
        </span>
      </div>
    );
  }

  // Badge Only
  return <Badge />;
};

export default NotificationBadge;