// src/components/Team/RequireTeamAccess.js
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import LoadingSpinner from '../ui/LoadingSpinner';

const RequireTeamAccess = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  useEffect(() => {
    const checkTeamAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        // Fetch the user profile from Firestore
        const userProfileRef = doc(db, 'profiles', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          // Check if user has team access
          if (profileData.teamAccess && profileData.teamAccess.hasAccess) {
            setHasAccess(true);
          }
        }
      } catch (error) {
        console.error("Error checking team access:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkTeamAccess();
  }, [user]);
  
  if (loading) {
    return <LoadingSpinner message="Loading schedule data..." />;
  }
  
  if (!hasAccess) {
    return <Navigate to="/" />;
  }
  
  return children;
};

export default RequireTeamAccess;