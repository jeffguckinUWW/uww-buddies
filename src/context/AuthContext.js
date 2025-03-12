import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { getVerificationSetting } from '../utils/verificationSettings';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize Google provider
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("Auth state changed:", user?.uid);
      if (user) {
        // Get the profile data
        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          // Combine auth user with profile data
          setUser({
            ...user,
            ...profileSnap.data()
          });
        } else {
          await checkAndCreateUserDocuments(user);
          setUser(user);
        }
      } else {
        setUser(null);
      }
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
        // Create a more complete profile with all necessary fields
        await setDoc(profileRef, {
          name: user.displayName || user.email,
          email: user.email,
          photoURL: user.photoURL || '',
          phone: '',
          bio: '',
          city: '',
          state: '',
          certificationLevel: 'Student Diver',
          specialties: [],
          divingStats: { totalDives: 0, maxDepth: 0, totalTime: 0 },
          syncWithLogbook: false,
          instructorCertifications: [],
          diveTrips: [],
          favoritePlace: '',
          favoriteDivesite: '',
          emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
            email: ''
          },
          socialLinks: {
            instagram: '',
            facebook: '',
            youtube: '',
            twitter: ''
          },
          privacySettings: {
            hideEmail: false,
            hidePhone: false,
            hideLocation: false,
            hideStats: false,
            hideSocial: false
          },
          lifetimePoints: 0,
          redeemablePoints: 0,
          transactions: [],
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified || false
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
      
      // Only send verification email if required
      if (getVerificationSetting()) {
        await sendEmailVerification(userCredential.user);
      }
      
      await checkAndCreateUserDocuments(userCredential.user);
      return userCredential;
    } catch (error) {
      console.error("Error during signup:", error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // The user documents will be created in the auth state change handler
      return result;
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user found");
    }
    
    try {
      await sendEmailVerification(auth.currentUser);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user found");
    }
    
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Change password
      await updatePassword(auth.currentUser, newPassword);
      return true;
    } catch (error) {
      console.error("Error changing password:", error);
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
    signInWithGoogle,
    logout,
    updateUserProfile,
    sendVerificationEmail,
    resetPassword,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};