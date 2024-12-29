import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const RequireInstructor = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isInstructor, setIsInstructor] = useState(false);

  useEffect(() => {
    const checkInstructorStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'profiles', user.uid));
        setIsInstructor(userDoc.data()?.role === 'instructor');
      } catch (error) {
        console.error('Error checking instructor status:', error);
      }
      
      setLoading(false);
    };

    checkInstructorStatus();
  }, [user]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !isInstructor) {
    return <Navigate to="/instructor" replace />;
  }

  return children;
};

export default RequireInstructor;