import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.uid); // Debug log
      if (user) {
        await checkAndCreateUserDocuments(user);
      }
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });
  
    return unsubscribe;
  }, []);

  const checkAndCreateUserDocuments = async (user) => {
    try {
      // Check and create user document
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName || user.email,
          email: user.email,
          buddyList: {},
          createdAt: new Date()
        });
      }

      // Check and create profile document
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (!profileSnap.exists()) {
        await setDoc(profileRef, {
          name: user.displayName || user.email,
          email: user.email,
          certificationLevel: 'Student Diver',
          specialties: [],
          numberOfDives: 0,
          hideEmail: false,
          hidePhone: false,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error("Error creating user documents:", error);
    }
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await checkAndCreateUserDocuments(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const updateUserProfile = async (displayName, photoURL) => {
    if (!user) return;
    try {
      await updateProfile(user, {
        displayName: displayName || user.displayName,
        photoURL: photoURL || user.photoURL
      });

      // Update user document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        displayName: displayName || user.displayName
      }, { merge: true });

      // Update profile document
      const profileRef = doc(db, 'profiles', user.uid);
      await setDoc(profileRef, {
        name: displayName || user.displayName
      }, { merge: true });

      // Force a user state update
      setUser({ ...user, displayName, photoURL });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    signup,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};