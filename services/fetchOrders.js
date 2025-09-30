import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Standalone fetchOrders function (can be imported separately)
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