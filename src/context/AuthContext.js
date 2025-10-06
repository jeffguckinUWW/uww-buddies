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
      // ONLY use profiles collection - single source of truth
      const profileRef = doc(db, 'profiles', user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        // Extract first name from Google displayName or email
        let defaultName = user.email.split('@')[0];
        if (user.displayName) {
          // If Google sign-in, use their actual name
          defaultName = user.displayName;
        }

        // Create a complete profile with all necessary fields
        // IMPORTANT: photoURL from Google is just a default - users can change it later
        const profileData = {
          name: defaultName,
          email: user.email,
          photoURL: user.photoURL || '', // Google photo as default, but user can override
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
          buddyList: {}, // Store buddies in profile
          lifetimePoints: 0,
          redeemablePoints: 0,
          transactions: [],
          authProvider: user.providerData[0]?.providerId || 'password', // Track how they signed up
          joinDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          emailVerified: user.emailVerified || false
        };

        await setDoc(profileRef, profileData);
        console.log('Created new profile for user:', user.uid, 'via', profileData.authProvider);
      } else {
        // Profile exists - ensure it has all required fields (migration safety)
        const existingData = profileSnap.data();
        const updates = {};

        // Add buddyList if missing (for old profiles)
        if (!existingData.buddyList) {
          updates.buddyList = {};
        }

        // Track auth provider if not set
        if (!existingData.authProvider) {
          updates.authProvider = user.providerData[0]?.providerId || 'password';
        }

        // Update if needed
        if (Object.keys(updates).length > 0) {
          await setDoc(profileRef, updates, { merge: true });
        }
      }
    } catch (error) {
      console.error("Error creating/updating user profile:", error);
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

      // Handle account exists with different credential
      if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error(
          'An account already exists with this email using a different sign-in method. ' +
          'Please sign in using your email and password instead.'
        );
      }

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
      // Update Firebase Auth profile (optional, mainly for consistency)
      await updateProfile(auth.currentUser, {
        displayName: displayName || user.displayName,
        photoURL: photoURL || user.photoURL
      });

      // Update ONLY profiles collection (single source of truth)
      const profileRef = doc(db, 'profiles', user.uid);
      const updates = {};

      if (displayName) updates.name = displayName;
      if (photoURL !== undefined) updates.photoURL = photoURL; // Allow empty string to clear photo

      await setDoc(profileRef, updates, { merge: true });

      // Fetch updated profile and update local state
      const updatedProfile = await getDoc(profileRef);
      if (updatedProfile.exists()) {
        setUser({ ...auth.currentUser, ...updatedProfile.data() });
      }
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