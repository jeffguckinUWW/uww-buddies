// utils/signatureUtils.js

import { collection, query, where, getDocs } from 'firebase/firestore';

// Generate a random alphanumeric string of specified length
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters (0,1,I,O)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Check if signature already exists in the database
const signatureExists = async (db, signature) => {
  const profilesRef = collection(db, 'profiles');
  const q = query(profilesRef, where('instructorSignature.code', '==', signature));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

// Generate a unique instructor signature
export const generateUniqueSignature = async (db) => {
  // Generate an 8-character alphanumeric signature
  let signature;
  let isUnique = false;
  
  // Keep generating until we find a unique one
  while (!isUnique) {
    signature = generateRandomString(8);
    isUnique = !(await signatureExists(db, signature));
  }
  
  return signature;
};