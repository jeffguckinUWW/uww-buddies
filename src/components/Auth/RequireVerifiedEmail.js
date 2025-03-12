import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getVerificationSetting } from '../../utils/verificationSettings';

// This component can be used as a wrapper for any route that requires email verification
function RequireVerifiedEmail({ children }) {
  const { user } = useAuth();
  const requireEmailVerification = getVerificationSetting();

  // Check if user is logged in
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Check if verification is required and email is not verified
  if (requireEmailVerification && !user.emailVerified) {
    return <Navigate to="/verify-email" />;
  }

  // If verification is not required or email is verified, render the children
  return children;
}

export default RequireVerifiedEmail;