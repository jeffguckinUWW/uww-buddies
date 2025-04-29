import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorDisplay = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <div className={`bg-red-50 p-4 rounded-md border border-red-200 ${className}`}>
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
        <p className="text-red-600">{typeof error === 'string' ? error : 'An error occurred. Please try again.'}</p>
      </div>
    </div>
  );
};

export default ErrorDisplay;