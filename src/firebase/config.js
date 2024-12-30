import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBi6wQMNZGMUIa5JL9A8xxbR2IWjvDfo3U",
  authDomain: "uww-buddies.firebaseapp.com",
  projectId: "uww-buddies",
  storageBucket: "uww-buddies.firebasestorage.app",  // Update this line to match
  messagingSenderId: "528108258916",
  appId: "1:528108258916:web:9816a187fe4781b9c8c171",
  measurementId: "G-434G3N3WJW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };