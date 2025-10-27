// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDpHKt0oWEiBS1ttzXBwnvPlAQfsOOg3Mo",
  authDomain: "lawn-caree.firebaseapp.com",
  projectId: "lawn-caree",
  storageBucket: "lawn-caree.firebasestorage.app",
  messagingSenderId: "231458856706",
  appId: "1:231458856706:web:f2708a5d6ff8f589742c1b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Export the db and app for use in other files
export { db, app };

// Connection status utility
export const checkFirebaseConnection = async () => {
  try {
    // Try to make a simple Firestore operation to test connection
    const { doc, getDoc } = await import('firebase/firestore');
    const testDoc = doc(db, '_test', 'connection');
    
    // This will attempt to connect to Firestore
    await getDoc(testDoc);
    return { connected: true, error: null };
  } catch (error) {
    console.warn('Firebase connection check failed:', error);
    
    // Proper error type handling for TypeScript
    let errorMessage = 'Unknown connection error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return { 
      connected: false, 
      error: errorMessage 
    };
  }
};