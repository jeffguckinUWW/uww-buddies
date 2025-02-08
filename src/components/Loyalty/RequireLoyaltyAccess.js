import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RequireLoyaltyAccess = ({ children }) => {
  const { user } = useAuth();

  // Check if user is logged in and has loyalty access
  if (!user?.loyaltyAccess?.hasAccess) {
    return <Navigate to="/" />;
  }

  return children;
};

export default RequireLoyaltyAccess;