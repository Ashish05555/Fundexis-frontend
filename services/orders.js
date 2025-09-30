import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Place a new order in Firestore
export async function placeOrder({ userId, challengeId, orderData }) {
  try {
    const ordersRef = collection(db, "users", userId, "challenges", challengeId, "orders");
    const docRef = await addDoc(ordersRef, orderData);
    return docRef.id;
  } catch (error) {
    console.error("Error placing order:", error);
    throw error;
  }
}

// Fetch all orders for a challenge
export async function fetchOrders({ userId, challengeId }) {
  try {
    const ordersRef = collection(db, "users", userId, "challenges", challengeId, "orders");
    const snapshot = await getDocs(ordersRef);
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
}