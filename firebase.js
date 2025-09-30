import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBD4eZqj59sDBCY1kcSqFKYfg2gUIN24KE",
  authDomain: "fundexis-ea0b5.firebaseapp.com",
  projectId: "fundexis-ea0b5",
  storageBucket: "fundexis-ea0b5.appspot.com",
  messagingSenderId: "758832599619",
  appId: "1:758832599619:web:d152b8c512dadde0367af6",
  measurementId: "G-13R0BSNZ5B"
};

// Initialize app only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence before any auth actions
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to local storage");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

// Helper: Wait until Firebase Auth is initialized before running your signup logic
const waitForAuthInit = () => {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub(); // Stop listening once ready
      resolve(user);
    });
  });
};

export { app, auth, db, waitForAuthInit };
