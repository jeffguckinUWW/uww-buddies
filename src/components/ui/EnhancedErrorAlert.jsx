import React from 'react';
import { AlertCircle, Wifi, Lock, FileX, Server } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { ErrorTypes } from '../../lib/utils';

const EnhancedErrorAlert = ({ error, onRetry, className = '' }) => {
  if (!error) return null;

  // Handle simple string errors
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorType = error.type || ErrorTypes.UNKNOWN;
  
  // Select icon based on error type
  const getIcon = () => {
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return <Wifi className="h-4 w-4" />;
      case ErrorTypes.PERMISSION:
        return <Lock className="h-4 w-4" />;
      case ErrorTypes.NOT_FOUND:
        return <FileX className="h-4 w-4" />;
      case ErrorTypes.SERVER:
        return <Server className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  
  // Get title based on error type
  const getTitle = () => {
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return 'Network Error';
      case ErrorTypes.PERMISSION:
        return 'Permission Denied';
      case ErrorTypes.NOT_FOUND:
        return 'Not Found';
      case ErrorTypes.VALIDATION:
        return 'Invalid Input';
      case ErrorTypes.SERVER:
        return 'Server Error';
      default:
        return 'Error';
    }
  };
  
  return (
    <Alert variant="destructive" className={className}>
      {getIcon()}
      <AlertTitle>{getTitle()}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col">
          <p>{errorMessage}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="text-sm underline mt-2 text-left hover:text-white"
            >
              Try Again
            </button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default EnhancedErrorAlert;