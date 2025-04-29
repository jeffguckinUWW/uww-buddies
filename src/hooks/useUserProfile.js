import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        setProfileLoaded(true);
        return;
      }

      try {
        // Method 1: Try to find the profile by uid field
        const profileQuery = query(
          collection(db, 'profiles'),
          where('uid', '==', user.uid)
        );
        const profileSnapshot = await getDocs(profileQuery);
        
        if (!profileSnapshot.empty) {
          const profileData = {
            id: profileSnapshot.docs[0].id,
            ...profileSnapshot.docs[0].data()
          };
          setUserProfile(profileData);
          
          // Check for admin rights - typically based on email
          setIsAdmin(user.email === 'jeff@diveuww.com');
          
        } else {
          // Method 2: Try to get the document directly by ID
          try {
            const directProfileRef = doc(db, 'profiles', user.uid);
            const directProfileSnap = await getDoc(directProfileRef);
            
            if (directProfileSnap.exists()) {
              const profileData = {
                id: directProfileSnap.id,
                ...directProfileSnap.data()
              };
              setUserProfile(profileData);
              setIsAdmin(user.email === 'jeff@diveuww.com');
            } else {
              // Method 3: Try to find by email if available
              if (user.email) {
                const emailProfileQuery = query(
                  collection(db, 'profiles'),
                  where('email', '==', user.email)
                );
                const emailProfileSnapshot = await getDocs(emailProfileQuery);
                
                if (!emailProfileSnapshot.empty) {
                  const profileData = {
                    id: emailProfileSnapshot.docs[0].id,
                    ...emailProfileSnapshot.docs[0].data()
                  };
                  setUserProfile(profileData);
                  setIsAdmin(user.email === 'jeff@diveuww.com');
                } else {
                  // No profile found for this user
                  setError('User profile not found');
                }
              } else {
                setError('User profile not found');
              }
            }
          } catch (err) {
            console.error('Error fetching profile directly:', err);
            setError('Failed to load user profile');
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
        setProfileLoaded(true);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  return { 
    userProfile, 
    isAdmin, 
    loading, 
    error, 
    profileLoaded 
  };
};