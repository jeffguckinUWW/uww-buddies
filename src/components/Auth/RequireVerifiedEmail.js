import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// This component can be used as a wrapper for any route that requires email verification
function RequireVerifiedEmail({ children }) {
  const { user } = useAuth();

  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if email is not verified
  if (!user.emailVerified) {
    return <Navigate to="/verify-email" />;
  }

  // If email is verified, render the children
  return children;
}

export default RequireVerifiedEmail;