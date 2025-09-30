import { db, auth } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

/**
 * Cancel an order and refund margin/brokerage to challenge balance.
 * @param {string} challengeId - Firestore document id for the challenge.
 * @param {string} orderId - Firestore document id for the order.
 */
export async function cancelOrder(challengeId, orderId) {
  const userUid = auth.currentUser.uid;
  const orderRef = doc(db, "users", userUid, "challenges", challengeId, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Order not found in Firestore");
  const order = orderSnap.data();

  // Refund margin and brokerage
  const challengeRef = doc(db, "users", userUid, "challenges", challengeId);
  const challengeSnap = await getDoc(challengeRef);
  if (!challengeSnap.exists()) throw new Error("Challenge not found in Firestore");
  const currentBalance = challengeSnap.data().balance || 0;
  const refund = (order.margin || 0) + (order.brokerage || 0);

  await updateDoc(challengeRef, { balance: currentBalance + refund });
  await updateDoc(orderRef, {
    status: "CANCELLED",
    closedAt: new Date().toISOString()
  });
}

/**
 * Exit an order and set P&L.
 * @param {string} challengeId - Firestore document id for the challenge.
 * @param {string} orderId - Firestore document id for the order.
 * @param {number} exitPrice - The price at which the order is exited.
 */
export async function exitOrder(challengeId, orderId, exitPrice) {
  const userUid = auth.currentUser.uid;
  const orderRef = doc(db, "users", userUid, "challenges", challengeId, "orders", orderId);
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) throw new Error("Order not found in Firestore");
  const order = orderSnap.data();

  // Calculate P&L (BUY/SIDE logic)
  const pnl = order.side === "BUY"
    ? (exitPrice - order.price) * order.quantity
    : (order.price - exitPrice) * order.quantity;

  await updateDoc(orderRef, {
    status: "COMPLETED",
    closedAt: new Date().toISOString(),
    exitPrice,
    pnl
  });

  // Optionally: refund margin if your business logic requires
}

/**
 * Modify an order (only if allowed, e.g. before execution).
 * @param {string} challengeId - Firestore document id for the challenge.
 * @param {string} orderId - Firestore document id for the order.
 * @param {object} updates - An object containing the fields to update.
 */
export async function modifyOrder(challengeId, orderId, updates) {
  const userUid = auth.currentUser.uid;
  const orderRef = doc(db, "users", userUid, "challenges", challengeId, "orders", orderId);
  await updateDoc(orderRef, updates);
}