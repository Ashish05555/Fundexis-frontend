import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  onAuthStateChanged 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// --- Firebase Config: Make sure this matches your Firebase Console exactly ---
const firebaseConfig = {
  apiKey: "AIzaSyD70X877hpb-7x0Q97h4-DwViSxrwz6Gzo",
  authDomain: "fundexis-app-75223.firebaseapp.com",
  projectId: "fundexis-app-75223",
  storageBucket: "fundexis-app-75223.appspot.com",
  messagingSenderId: "866869994499",
  appId: "1:866869994499:web:beef6543cb425265ddda36",
  measurementId: "G-JD1TY81QYG"
};

// --- Initialize App: Only once ---
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// --- Initialize Firebase Services ---
const auth = getAuth(app);
const db = getFirestore(app);

// --- Optionally Enable Analytics (works only in production on https) ---
let analytics;
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  try {
    analytics = getAnalytics(app);
  } catch (e) {
    console.warn("Analytics not initialized:", e);
  }
}

// --- Set Persistence BEFORE Any Auth Actions ---
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to local storage");
  })
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

// --- Helper: Wait Until Firebase Auth is Initialized ---
const waitForAuthInit = () => {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub(); // Stop listening once ready
      resolve(user);
    });
  });
};

// --- Debug: Log Firebase Connection Status ---
if (typeof window !== "undefined") {
  window.firebaseStatus = {
    config: firebaseConfig,
    connected: !!app,
    analyticsEnabled: !!analytics,
    firestore: !!db,
    auth: !!auth
  };
  console.log("Firebase status:", window.firebaseStatus);
}

// --- Export Services ---
export { app, auth, db, analytics, waitForAuthInit };