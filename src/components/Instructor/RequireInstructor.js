import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const RequireInstructor = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'profiles', user.uid));
        const userData = userDoc.data();
        const instructorAccess = userData?.instructorAccess?.hasAccess;
        
        setHasAccess(instructorAccess);
        
        if (!instructorAccess) {
          localStorage.setItem('instructorAccessError', 'The Instructor Portal is only available for Underwater World Instructors.');
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking instructor access:', error);
        setHasAccess(false);
        localStorage.setItem('instructorAccessError', 'Error checking instructor access. Please try again.');
        navigate('/');
      }
      
      setLoading(false);
    };

    checkAccess();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return children;
};

export default RequireInstructor;