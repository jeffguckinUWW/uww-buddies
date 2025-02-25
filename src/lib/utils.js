// src/lib/utils.js
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Error types
export const ErrorTypes = {
  NETWORK: 'network',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  VALIDATION: 'validation',
  SERVER: 'server',
  UNKNOWN: 'unknown'
};

// Custom error class
export class AppError extends Error {
  constructor(message, type = ErrorTypes.UNKNOWN, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
  }
}

// Helper to format Firebase errors
export const formatFirebaseError = (error) => {
  const errorCode = error?.code || '';
  
  // Permission errors
  if (errorCode.includes('permission-denied')) {
    return new AppError(
      'You don\'t have permission to perform this action',
      ErrorTypes.PERMISSION,
      error
    );
  }
  
  // Network errors
  if (errorCode.includes('unavailable') || errorCode.includes('network-request-failed')) {
    return new AppError(
      'Network connection issue. Please check your internet connection',
      ErrorTypes.NETWORK,
      error
    );
  }
  
  // Not found errors
  if (errorCode.includes('not-found')) {
    return new AppError(
      'The requested resource was not found',
      ErrorTypes.NOT_FOUND,
      error
    );
  }
  
  // Validation errors
  if (errorCode.includes('invalid-argument')) {
    return new AppError(
      'Invalid input provided',
      ErrorTypes.VALIDATION,
      error
    );
  }
  
  // Server errors
  if (errorCode.includes('internal')) {
    return new AppError(
      'Server error occurred. Please try again later',
      ErrorTypes.SERVER,
      error
    );
  }
  
  // Default error
  return new AppError(
    error?.message || 'An unexpected error occurred',
    ErrorTypes.UNKNOWN,
    error
  );
};

// Function to handle and log errors
export const handleError = (error, context = '') => {
  const formattedError = error instanceof AppError 
    ? error 
    : formatFirebaseError(error);
  
  // Log error with context
  console.error(`Error in ${context}:`, formattedError);
  
  if (formattedError.originalError) {
    console.error('Original error:', formattedError.originalError);
  }
  
  return formattedError;
};