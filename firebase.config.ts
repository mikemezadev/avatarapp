import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Replace with your Firebase project configuration
// Get this from Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: "AIzaSyD6hZ_ZT8unlekIkqBza2EC_ZF5EvtDyDY",
  authDomain: "mtgmanager-1b712.firebaseapp.com",
  projectId: "mtgmanager-1b712",
  storageBucket: "mtgmanager-1b712.firebasestorage.app",
  messagingSenderId: "1032758501972",
  appId: "1:1032758501972:web:4ece50fd954c747cb7c3c1",
  measurementId: "G-6DJEC5WD9D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

export default app;
