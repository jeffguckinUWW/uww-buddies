// src/components/ui/LoadingSpinner.jsx
import React from 'react';
import { RefreshCw } from 'lucide-react';

// LoadingSpinner component with customizable size, message, and fullscreen mode
const LoadingSpinner = ({ 
  size = 'default', 
  message = 'Loading...', 
  fullScreen = false 
}) => {
  // Determine size classes
  const sizeClasses = {
    small: 'h-4 w-4',
    default: 'h-8 w-8',
    large: 'h-12 w-12'
  };
  
  const iconSize = sizeClasses[size] || sizeClasses.default;
  
  // For fullscreen loading, cover the entire area
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex justify-center items-center bg-white/80 z-50">
        <div className="text-gray-600 flex flex-col items-center">
          <RefreshCw className={`${iconSize} animate-spin mb-4`} />
          <p>{message}</p>
        </div>
      </div>
    );
  }
  
  // For inline loading
  return (
    <div className="flex justify-center items-center py-8">
      <div className="text-gray-600 flex flex-col items-center">
        <RefreshCw className={`${iconSize} animate-spin mb-2`} />
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;