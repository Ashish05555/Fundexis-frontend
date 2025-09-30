// services/paymentService.js

// Helper to get backend baseURL easily (supports both dev and prod with one line change)
const BASE_URL = "http://localhost:5000/api/payment";
// If deploying, replace with your production URL, e.g. "https://yourdomain.com/api/payment"

export const createOrder = async (amount) => {
  try {
    const res = await fetch(`${BASE_URL}/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return await res.json();
  } catch (error) {
    // You may want better error handling in production
    return { error: error.message || "Unknown error" };
  }
};

// MOCK: Always return success for demo! (simulates successful payment verification)
export const verifyPayment = async (order_id, payment_id) => {
  return { status: "success", order_id, payment_id };
  // --- REMOVE THE LINES BELOW for demo ---
  /*
  try {
    const res = await fetch(`${BASE_URL}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id, payment_id }),
    });
    if (!res.ok) throw new Error('Failed to verify payment');
    return await res.json();
  } catch (error) {
    return { error: error.message || "Unknown error" };
  }
  */
};