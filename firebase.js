import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  // ...more keys
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);