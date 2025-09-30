/**
 * services/executeTrade.js (FULL UPDATED VERSION)
 *
 * IMPORTANT:
 * - Backend trade routes are mounted at /api/trade (from your app.js).
 * - This client only calls your backend; it does NOT write directly to Firestore.
 *
 * Endpoints used here (must exist on backend):
 *   POST /api/trade/orders/executeNow
 *   POST /api/trade/orders/evaluate
 *   POST /api/trade/close
 *   POST /api/trade/add   (optional, if implemented)
 *
 * Zerodha-like behavior (server decides):
 * - REGULAR + MARKET: executes immediately.
 * - REGULAR + LIMIT (SL off): executes immediately ONLY if marketable; else remains PENDING (Open Orders).
 * - SL/Stop-Limit: never executes immediately; waits for trigger/evaluator.
 */

const API_BASE =
  (typeof globalThis !== "undefined" && globalThis.API_BASE_URL) ||
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.REACT_APP_API_BASE ||
  "http://localhost:5000"; // backend base URL

// Base path that matches your app.js mount: app.use('/api/trade', tradeRoutes)
const TRADE_BASE =
  (process.env.EXPO_PUBLIC_TRADE_BASE ||
    process.env.REACT_APP_TRADE_BASE ||
    "/api/trade").replace(/\/$/, "");

// Enable verbose logs by setting EXPO_PUBLIC_EXECUTE_LOGS=true (or REACT_APP_EXECUTE_LOGS=true)
const DEBUG_LOGS =
  String(process.env.EXPO_PUBLIC_EXECUTE_LOGS || process.env.REACT_APP_EXECUTE_LOGS || "")
    .toLowerCase() === "true";

/**
 * Low-level POST helper
 */
async function postJSON(path, body, signal) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (DEBUG_LOGS) {
    // eslint-disable-next-line no-console
    console.log("[POST]", url, { req: body, status: res.status, res: data });
  }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

function tradePath(p) {
  return `${TRADE_BASE}${p.startsWith("/") ? p : `/${p}`}`;
}

/**
 * Attempt immediate execution (server decides):
 * - REGULAR + MARKET => execute now
 * - REGULAR + LIMIT (no SL) => execute if marketable, else remain PENDING
 * - SL/Stop-Limit => never immediate here
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.challengeId
 * @param {string} params.orderId
 * @param {number} [params.ltp] Optional current LTP to help server
 * @param {AbortSignal} [params.signal]
 */
export async function executeOrderAndCreateTrade({ userId, challengeId, orderId, ltp, signal } = {}) {
  if (!userId || !challengeId || !orderId) {
    throw new Error("userId, challengeId, and orderId are required");
  }
  // Non-fatal on failure so LIMIT orders remain visible as PENDING
  try {
    return await postJSON(tradePath("/orders/executeNow"), { userId, challengeId, orderId, ltp }, signal);
  } catch (e) {
    if (DEBUG_LOGS) {
      // eslint-disable-next-line no-console
      console.warn("[executeNow] non-fatal:", e.message);
    }
    return { success: false, skipped: true, reason: "client_fallback", error: e.message };
  }
}

/**
 * Evaluate resting orders (PENDING / ACTIVE_LIMIT) for an instrument on ticks.
 * Call this from your live price handler.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.challengeId
 * @param {string|number} params.tokenOrSymbol instrument_token or tradingsymbol
 * @param {number} [params.bid]
 * @param {number} [params.ask]
 * @param {number} [params.ltp]
 * @param {AbortSignal} [params.signal]
 */
export async function evaluateOrdersOnTick({ userId, challengeId, tokenOrSymbol, bid, ask, ltp, signal } = {}) {
  if (!userId || !challengeId || !tokenOrSymbol) return null;
  try {
    return await postJSON(
      tradePath("/orders/evaluate"),
      { userId, challengeId, tokenOrSymbol, bid, ask, ltp },
      signal
    );
  } catch (e) {
    if (DEBUG_LOGS) {
      // eslint-disable-next-line no-console
      console.warn("[orders/evaluate] error:", e.message);
    }
    return null;
  }
}

/**
 * Manually close (square-off) an ACTIVE trade.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.challengeId
 * @param {string} params.tradeId
 * @param {number} params.exitPrice
 * @param {AbortSignal} [params.signal]
 */
export async function closeTrade({ userId, challengeId, tradeId, exitPrice, signal } = {}) {
  if (!userId || !challengeId || !tradeId || typeof exitPrice !== "number") {
    throw new Error("userId, challengeId, tradeId, and numeric exitPrice are required");
  }
  return postJSON(tradePath("/close"), { userId, challengeId, tradeId, exitPrice }, signal);
}

/**
 * Optional: Add quantity to an ACTIVE trade (averaging).
 * Requires backend POST /api/trade/add
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.challengeId
 * @param {string} params.tradeId
 * @param {number} params.addQuantity
 * @param {number} params.addPrice
 * @param {AbortSignal} [params.signal]
 */
export async function addToTrade({ userId, challengeId, tradeId, addQuantity, addPrice, signal } = {}) {
  if (!userId || !challengeId || !tradeId || typeof addQuantity !== "number" || typeof addPrice !== "number") {
    throw new Error("userId, challengeId, tradeId, addQuantity, and addPrice are required");
  }
  return postJSON(tradePath("/add"), { userId, challengeId, tradeId, addQuantity, addPrice }, signal);
}