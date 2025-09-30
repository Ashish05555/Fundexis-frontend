import { collection, addDoc, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// Execute a trade (add to trades, update challenge balance/status)
export async function executeTrade({ userId, challengeId, tradeData, newBalance }) {
  try {
    const tradesRef = collection(db, "users", userId, "challenges", challengeId, "trades");
    await addDoc(tradesRef, tradeData);
    // Update challenge balance (and optionally status)
    const challengeDocRef = doc(db, "users", userId, "challenges", challengeId);
    await updateDoc(challengeDocRef, { balance: newBalance });
    return true;
  } catch (error) {
    console.error("Error executing trade:", error);
    throw error;
  }
}

// Fetch all trades for a challenge
export async function fetchTrades({ userId, challengeId }) {
  try {
    const tradesRef = collection(db, "users", userId, "challenges", challengeId, "trades");
    const snapshot = await getDocs(tradesRef);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error fetching trades:", error);
    throw error;
  }
}