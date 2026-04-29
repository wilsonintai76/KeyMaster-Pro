import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlHVttSl9_kpg0oSnb2H06GmO1tFUXlEk",
  authDomain: "keymaster-pro-182e7.firebaseapp.com",
  databaseURL: "https://keymaster-pro-182e7-default-rtdb.firebaseio.com",
  projectId: "keymaster-pro-182e7",
  storageBucket: "keymaster-pro-182e7.firebasestorage.app",
  messagingSenderId: "39167657749",
  appId: "1:39167657749:web:05b4fb1812d073edcfcb1c",
  measurementId: "G-SGVNQLJ1T3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const auth = getAuth(app);

let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      const currentDomain = window.location.hostname;
      console.error(`Firebase Auth Domain Error: "${currentDomain}" is not authorized. Please add it to Authorized Domains in Firebase Console (Authentication > Settings).`);
    } else {
      console.error("Firebase Google Auth Error:", error);
    }
    throw error;
  }
};

export const logoutGoogle = async (): Promise<void> => {
  await auth.signOut();
};

export { app, analytics, db, rtdb, auth };
