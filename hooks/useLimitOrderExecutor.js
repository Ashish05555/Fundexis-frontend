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

// Helpers
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
function isBuy(order) {
  const s = String(order.transaction_type || order.side || "").toUpperCase();
  return s === "BUY";
}
function shouldTriggerStop(order, ltp) {
  const trig = Number(order.trigger_price ?? order.triggerPrice ?? NaN);
  if (!Number.isFinite(trig) || !Number.isFinite(ltp)) return false;
  const trig2 = Math.round(trig * 100) / 100;
  const ltp2 = Math.round(ltp * 100) / 100;
  // For buy: trigger if LTP >= trigger. For sell: trigger if LTP <= trigger.
  return isBuy(order) ? ltp2 >= trig2 : ltp2 <= trig2;
}
function shouldFillLimit(order, ltp) {
  const px = Number(
    order.stoploss_limit ??
      order.price ??
      order.limitPrice ??
      order.stopLimit ??
      NaN
  );
  if (!Number.isFinite(px) || !Number.isFinite(ltp)) return false;
  const px2 = Math.round(px * 100) / 100;
  const ltp2 = Math.round(ltp * 100) / 100;
  return isBuy(order) ? ltp2 <= px2 : ltp2 >= px2;
}
const OPEN_STATUSES = new Set(["OPEN", "PENDING", "PLACED", "SCHEDULED", "TO_EXECUTE"]);

export function useLimitOrderExecutor({ uid, challengeId, marketOpen, onExecuted }) {
  const db = getFirestore();
  const [openOrders, setOpenOrders] = useState([]);

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

  const tokens = useMemo(() => {
    const set = new Set();
    for (const o of openOrders) {
      const sym = o.tradingsymbol || o.symbol;
      const { instrument_token } = findInstrument(sym);
      if (instrument_token != null) set.add(String(instrument_token));
      const tok = getOrderToken(o);
      if (tok) set.add(String(tok));
    }
    return Array.from(set);
  }, [openOrders]);

  const ltpByToken = useLivePrices(tokens);
  const processingRef = useRef(new Set());

  useEffect(() => {
    if (!uid || !challengeId) return;
    if (!openOrders.length) return;
    if (!marketOpen) return;

    openOrders.forEach((order) => {
      const orderId = order.id;
      if (!orderId) return;
      if (processingRef.current.has(orderId)) return;

      const sym = order.tradingsymbol || order.symbol;
      const { instrument_token, exchange } = findInstrument(sym);
      const token =
        getOrderToken(order) ??
        (instrument_token != null ? String(instrument_token) : undefined);
      if (!token) return;

      const ltpRaw = ltpByToken[String(token)];
      const ltp = typeof ltpRaw === "string" ? Number(ltpRaw) : ltpRaw;
      if (typeof ltp !== "number" || Number.isNaN(ltp)) return;

      const type = String(order.order_type || order.type || "").toUpperCase();
      if (type !== "LIMIT" && type !== "STOP_LIMIT") return;

      (async () => {
        try {
          processingRef.current.add(orderId);

          let triggered = order.triggered;
          let justTriggered = false;

          // For STOP_LIMIT: if not triggered, check and trigger INSTANTLY if price crosses
          if (type === "STOP_LIMIT" && !triggered) {
            if (shouldTriggerStop(order, ltp)) {
              const orderRef = doc(db, "users", uid, "challenges", challengeId, "orders", orderId);
              try {
                await updateDoc(orderRef, {
                  triggered: true,
                  triggeredAt: serverTimestamp(),
                  status: "OPEN",
                });
                triggered = true;
                justTriggered = true;
              } catch (_) {}
            }
          }

          // After being triggered (or for LIMIT): check for limit fill (crossing logic!) on same tick!
          const eligibleForLimit =
            type === "LIMIT" ||
            (type === "STOP_LIMIT" && (triggered || justTriggered || shouldTriggerStop(order, ltp)));

          if (eligibleForLimit && shouldFillLimit(order, ltp)) {
            await fillOrderAtomic({
              db,
              uid,
              challengeId,
              order,
              fillPrice: ltp,
              exchangeFallback: exchange || "NSE",
            });

            if (typeof onExecuted === "function") {
              try {
                onExecuted();
              } catch (_) {}
            }
          }
        } finally {
          processingRef.current.delete(orderId);
        }
      })();
    });
  }, [uid, challengeId, marketOpen, openOrders, ltpByToken, db, onExecuted]);
}

// Atomic fill: FILLED + trade in single transaction
async function fillOrderAtomic({ db, uid, challengeId, order, fillPrice, exchangeFallback }) {
  const ordersPath = ["users", uid, "challenges", challengeId, "orders"];
  const tradesPath = ["users", uid, "challenges", challengeId, "trades"];

  const orderRef = doc(db, ...ordersPath, order.id);
  const tradeRef = doc(collection(db, ...tradesPath));

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) return;

    const cur = snap.data() || {};
    const status = String(cur.status || "OPEN").toUpperCase();
    const type = String(cur.order_type || cur.type || "").toUpperCase();

    if (!OPEN_STATUSES.has(status)) return;
    if (cur.tradeId) return;
    if (type === "STOP_LIMIT" && cur.triggered !== true) return;

    const qty = Number(cur.quantity || cur.filled_quantity || 0);
    if (!Number.isFinite(qty) || qty <= 0) return;

    const side = String(cur.transaction_type || cur.side || "BUY").toUpperCase();
    const instrument = cur.instrument || {};
    const tsym =
      cur.tradingsymbol ||
      instrument.tradingsymbol ||
      instrument.symbol ||
      cur.symbol ||
      "";

    const tradeDoc = {
      orderId: order.id,
      tradingsymbol: tsym,
      instrument_token:
        instrument.instrument_token ?? instrument.token ?? cur.instrument_token ?? cur.token,
      exchange: cur.exchange || instrument.exchange || instrument.segment || exchangeFallback || "NSE",
      product: cur.product || cur.product_type || "MIS",
      side,
      transaction_type: side,
      quantity: qty,
      price: fillPrice,
      ltp: fillPrice,
      status: "ACTIVE",
      createdAt: serverTimestamp(),
      openedAt: serverTimestamp(),
    };

    let updateData = {
      status: "FILLED",
      executedAt: serverTimestamp(),
      executionPrice: fillPrice,
      avg_price: fillPrice,
      filled_quantity: qty,
      reason: (type === "STOP_LIMIT" ? "Stop triggered & limit met" : "Limit reached"),
      tradeId: tradeRef.id,
    };
    if (type === "STOP_LIMIT" || cur.triggered === true) {
      updateData.triggered = true;
    }

    tx.set(tradeRef, tradeDoc);
    tx.update(orderRef, updateData);
  });
}