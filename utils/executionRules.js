import { useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  getFirestore,
} from "firebase/firestore";
import instrumentsData from "../data/instruments.json";
import { useLivePrices } from "../context/LivePriceProvider";

// ---------- Instrument helpers ----------
function findInstrument(symbol) {
  if (!symbol) return {};
  const symU = String(symbol).toUpperCase();
  const inst =
    instrumentsData.find((m) => String(m.symbol).toUpperCase() === symU) ||
    instrumentsData.find((m) => String(m.tradingsymbol).toUpperCase() === symU);
  if (!inst) return {};
  return {
    instrument_token: inst.instrument_token,
    exchange:
      (inst.exchange || inst.exch || inst.segment || inst.exchSegment || "NSE") + "",
    meta: inst,
  };
}
function getOrderToken(order) {
  const inst = order?.instrument || {};
  const tok = inst.instrument_token ?? inst.token ?? order?.instrument_token ?? order?.token;
  if (tok == null) return undefined;
  return String(tok);
}

// ---------- Execution rules ----------
function isBuy(order) {
  const s = String(order.transaction_type || order.side || "").toUpperCase();
  return s === "BUY";
}
function shouldFillLimit(order, ltp) {
  const px = Number(
    order.stoploss_limit ??
      order.price ??
      order.limitPrice ??
      order.stopLimit ??
      NaN
  );
  if (!Number.isFinite(px)) return false;
  return isBuy(order) ? ltp <= px : ltp >= px;
}
function shouldTriggerStop(order, ltp) {
  const trig = Number(order.trigger_price ?? order.triggerPrice ?? NaN);
  if (!Number.isFinite(trig)) return false;
  return isBuy(order) ? ltp >= trig : ltp <= trig;
}

// ---------- Hook ----------
const OPEN_STATUSES = new Set(["OPEN", "PENDING", "PLACED", "SCHEDULED", "TO_EXECUTE"]);

export function useLimitOrderExecutor({ uid, challengeId, marketOpen, onExecuted }) {
  const db = getFirestore();
  const [openOrders, setOpenOrders] = useState([]);

  // Live subscribe to all orders under the challenge; filter client-side
  useEffect(() => {
    if (!uid || !challengeId) return;
    const ordersCol = collection(db, "users", uid, "challenges", challengeId, "orders");
    const unsub = onSnapshot(
      ordersCol,
      (snap) => {
        const rows = [];
        snap.forEach((d) => {
          const o = { id: d.id, ...d.data() };
          const status = String(o.status || "OPEN").toUpperCase();
          const type = String(o.order_type || o.type || "").toUpperCase();
          if (!OPEN_STATUSES.has(status)) return;
          if (type !== "LIMIT" && type !== "STOP_LIMIT") return;
          rows.push(o);
        });
        setOpenOrders(rows);
      },
      () => setOpenOrders([])
    );
    return () => unsub();
  }, [uid, challengeId, db]);

  // Subscribe to LTP for instruments referenced by open orders
  const tokens = useMemo(() => {
    const set = new Set();
    for (const o of openOrders) {
      const sym = o.tradingsymbol || o.symbol;
      const { instrument_token } = findInstrument(sym);
      if (instrument_token != null) set.add(String(instrument_token));
      // also add from embedded instrument if present
      const tok = getOrderToken(o);
      if (tok) set.add(String(tok));
    }
    return Array.from(set);
  }, [openOrders]);

  const ltpByToken = useLivePrices(tokens);

  // In-flight and debounce guards
  const processingRef = useRef(new Set()); // orders being processed
  const debounceRef = useRef(new Map());   // orderId -> last processed time

  const canProcess = (orderId) => {
    const now = Date.now();
    const last = debounceRef.current.get(orderId) || 0;
    if (now - last < 150) return false; // 150ms debounce per order
    debounceRef.current.set(orderId, now);
    return true;
  };

  useEffect(() => {
    if (!uid || !challengeId) return;
    if (!openOrders.length) return;
    // Execute only during market hours for REGULAR orders.
    // For AMO, we also want to execute only when marketOpen === true
    if (!marketOpen) return;

    (async () => {
      for (const order of openOrders) {
        const orderId = order.id;
        if (!orderId) continue;
        if (processingRef.current.has(orderId)) continue;
        if (!canProcess(orderId)) continue;

        const sym = order.tradingsymbol || order.symbol;
        const { instrument_token, exchange } = findInstrument(sym);
        const token =
          getOrderToken(order) ??
          (instrument_token != null ? String(instrument_token) : undefined);
        if (!token) continue;

        const ltp = ltpByToken[String(token
