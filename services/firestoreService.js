import { db } from '../firebase'; // Ensure this imports your Firestore instance
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

/**
 * Place an order for a user in a specific challenge.
 * @param {string} userId
 * @param {string} challengeId
 * @param {object} orderData - {symbol, qty, price, orderType, type, timestamp, etc.}
 * @returns {Promise<object>} - The added order doc ref
 */
export async function placeOrder(userId, challengeId, orderData) {
  try {
    const ordersRef = collection(
      db,
      "users",
      userId,
      "challenges",
      challengeId,
      "orders"
    );
    const docRef = await addDoc(ordersRef, {
      ...orderData,
      createdAt: new Date().toISOString()
    });
    return docRef;
  } catch (error) {
    console.error("Error placing order:", error);
    throw error;
  }
}

/**
 * Place a trade for a user in a specific challenge.
 * @param {string} userId
 * @param {string} challengeId
 * @param {object} tradeData - {symbol, qty, price, tradeType, timestamp, etc.}
 * @returns {Promise<object>} - The added trade doc ref
 */
export async function placeTrade(userId, challengeId, tradeData) {
  try {
    const tradesRef = collection(
      db,
      "users",
      userId,
      "challenges",
      challengeId,
      "trades"
    );
    const docRef = await addDoc(tradesRef, {
      ...tradeData,
      createdAt: new Date().toISOString()
    });
    return docRef;
  } catch (error) {
    console.error("Error placing trade:", error);
    throw error;
  }
}

/**
 * Update challenge stats (balance, breached, etc).
 * @param {string} userId
 * @param {string} challengeId
 * @param {object} updateData - fields to update
 * @returns {Promise<void>}
 */
export async function updateChallenge(userId, challengeId, updateData) {
  try {
    const challengeDocRef = doc(
      db,
      "users",
      userId,
      "challenges",
      challengeId
    );
    await updateDoc(challengeDocRef, updateData);
  } catch (error) {
    console.error("Error updating challenge:", error);
    throw error;
  }
}

/**
 * Get challenge details
 * @param {string} userId
 * @param {string} challengeId
 * @returns {Promise<object|null>}
 */
export async function getChallenge(userId, challengeId) {
  try {
    const challengeDocRef = doc(
      db,
      "users",
      userId,
      "challenges",
      challengeId
    );
    const challengeSnap = await getDoc(challengeDocRef);
    return challengeSnap.exists() ? challengeSnap.data() : null;
  } catch (error) {
    console.error("Error getting challenge:", error);
    throw error;
  }
}

/**
 * Get all orders for a challenge
 * @param {string} userId
 * @param {string} challengeId
 * @returns {Promise<Array>} Array of order objects
 */
export async function getOrders(userId, challengeId) {
  try {
    const ordersRef = collection(
      db,
      "users",
      userId,
      "challenges",
      challengeId,
      "orders"
    );
    const snapshot = await getDocs(ordersRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting orders:", error);
    throw error;
  }
}

/**
 * Get all trades for a challenge
 * @param {string} userId
 * @param {string} challengeId
 * @returns {Promise<Array>} Array of trade objects
 */
export async function getTrades(userId, challengeId) {
  try {
    const tradesRef = collection(
      db,
      "users",
      userId,
      "challenges",
      challengeId,
      "trades"
    );
    const snapshot = await getDocs(tradesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting trades:", error);
    throw error;
  }
}

/**
 * Get orders by status for a challenge (optional utility)
 * @param {string} userId
 * @param {string} challengeId
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getOrdersByStatus(userId, challengeId, status) {
  try {
    const ordersRef = collection(
      db,
      "users",
      userId,
      "challenges",
      challengeId,
      "orders"
    );
    const q = query(ordersRef, where("status", "==", status));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting orders by status:", error);
    throw error;
  }
}