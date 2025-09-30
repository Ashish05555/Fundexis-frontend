import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "../components/OpenOrderCard.css";

/**
 * OpenOrderCard
 * - Equal spacing across 3 rows on the card
 * - Modal header shows Trigger and Limit only once
 * - Type-aware price mapping:
 *    SL-M  -> trigger = price, limit = —
 *    SL-L  -> limit = limit fields or price; trigger must be trigger_price (no guessing from price)
 *    Other -> standard mapping (limit/price as usual)
 * - Robust trigger discovery (direct keys, known nested, deep keys, strings)
 * - Toggle debug logs: window.__DEBUG_OPEN_ORDERS = false
 */

const EXCHANGE_COLORS = { NSE: "#e53935", BSE: "#1976d2", NFO: "#888" };

if (typeof window !== "undefined" && window.__DEBUG_OPEN_ORDERS == null) {
  window.__DEBUG_OPEN_ORDERS = true;
}

/* ---------- utils ---------- */
function upper(v, fb = "") {
  return String(v ?? fb).toUpperCase();
}
function isPosNum(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}
function formatNumber(num) {
  if (!isPosNum(num)) return "—";
  return Number(num).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatCurrency(num) {
  if (!isPosNum(num)) return "—";
  return "₹" + Number(num).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ---------- order type helpers ---------- */
function getKind(order) {
  const ot = upper(order?.order_type || "");
  const pt = upper(order?.price_type || "");
  const txt = `${ot} ${pt}`;

  const isSLM = /\bSLM\b|\bSL-M\b/.test(txt);
  const isSLL =
    /\bSL[-_ ]?L(IMIT)?\b/.test(txt) ||
    // some payloads send just "SL" for SL-Limit
    (/\bSL\b/.test(txt) && !isSLM);

  const isPlainLimit = /\bLIMIT\b/.test(txt) || /\bLMT\b/.test(txt);

  return { isSLM, isSLL, isPlainLimit, txt };
}

/* ---------- key dictionaries ---------- */
const TRIGGER_KEYS = [
  "trigger_price",
  "triggerPrice",
  "trigger",
  "triggerprice",
  "stop_price",
  "stopPrice",
  "sl_trigger_price",
  "slTriggerPrice",
  "sl_trigger",
  "slTrigger",
  "stoploss_trigger_price",
  "stoploss_trigger",
  "stopLossTrigger",
  // less common
  "trigPrice",
  "triggerPriceValue",
  "sl_price",
  "stoploss_price",
];

const LIMIT_KEYS = [
  "stop_limit_price",
  "stoploss_limit",
  "stopLimitPrice",
  "target_limit",
  "target_limit_price",
  "targetLimit",
  "stop_limit",
  "stopLimit",
  "limit_price",
  "limitPrice",
  "order_price",
  "lmt",
  "lmtPrice",
  // NOTE: deliberately NOT including "price" here anymore to avoid wrong mapping
  "price_per_unit",
];

/* ---------- nested/object numeric extraction ---------- */
const INNER_NUM_KEYS = ["price", "value", "amount", "val", "p", "trigger", "trigger_price", "stop_price"];

function findNumericInside(container, basePath, depth = 0, maxDepth = 2) {
  if (!container || typeof container !== "object" || depth > maxDepth) return { value: undefined, path: "" };

  for (const key of INNER_NUM_KEYS) {
    const n = toNum(container?.[key]);
    if (isPosNum(n)) return { value: n, path: `${basePath}.${key}` };
  }
  for (const k of Object.keys(container)) {
    const v = container[k];
    const np = `${basePath}.${k}`;
    const n = toNum(v);
    if (isPosNum(n)) return { value: n, path: np };
  }
  for (const k of Object.keys(container)) {
    const v = container[k];
    if (v && typeof v === "object") {
      const f = findNumericInside(v, `${basePath}.${k}`, depth + 1, maxDepth);
      if (isPosNum(f.value)) return f;
    }
  }
  return { value: undefined, path: "" };
}

function pickByKeysWithPath(obj, keys, basePath = "order") {
  for (const k of keys) {
    const raw = obj?.[k];
    const np = `${basePath}.${k}`;
    const n = toNum(raw);
    if (isPosNum(n)) return { value: n, path: np };
    if (raw && typeof raw === "object") {
      const f = findNumericInside(raw, np);
      if (isPosNum(f.value)) return f;
    }
  }
  return { value: undefined, path: "" };
}

/* ---------- known nested containers ---------- */
const NESTED_CONTAINERS = ["stoploss", "stopLoss", "stop_loss", "sl", "slParams", "slDetails", "params", "details", "meta"];
const NESTED_TRIGGER_KEYS = [
  "trigger_price",
  "triggerPrice",
  "trigger",
  "sl_trigger_price",
  "slTriggerPrice",
  "sl_trigger",
  "sl_price",
  "stop_price",
  "stoploss_trigger",
  "stoploss_trigger_price",
  "stoploss_price",
];

function pickFromKnownNestedContainers(order, basePath = "order") {
  for (const cont of NESTED_CONTAINERS) {
    const box = order?.[cont];
    if (!box) continue;

    const byKey = pickByKeysWithPath(box, NESTED_TRIGGER_KEYS, `${basePath}.${cont}`);
    if (isPosNum(byKey.value)) return byKey;

    if (box && typeof box === "object") {
      for (const k of Object.keys(box)) {
        const v = box[k];
        const np = `${basePath}.${cont}.${k}`;
        if (/trig|stop|sl/i.test(k)) {
          const n = toNum(v);
          if (isPosNum(n)) return { value: n, path: np };
          if (v && typeof v === "object") {
            const deep = findNumericInside(v, np);
            if (isPosNum(deep.value)) return deep;
          }
        }
      }
    }
  }
  return { value: undefined, path: "" };
}

/* ---------- deep search ---------- */
function deepFindNumberLikeKey(
  obj,
  { match = /(trig(ger)?(_price)?|stop(_price)?|sl(_?trigger|_?price)?|stoploss_(trigger|price))/i, ignore = /(triggered|time|count|id)/i, maxDepth = 4 } = {},
  basePath = "order"
) {
  try {
    const stack = [{ o: obj, d: 0, p: basePath }];
    const seen = new Set();
    while (stack.length) {
      const { o, d, p } = stack.pop();
      if (!o || typeof o !== "object" || seen.has(o) || d > maxDepth) continue;
      seen.add(o);

      if (Array.isArray(o)) {
        for (let i = 0; i < o.length; i++) {
          const it = o[i];
          const np = `${p}[${i}]`;
          const n = toNum(it);
          if (isPosNum(n)) return { value: n, path: np };
          if (it && typeof it === "object") stack.push({ o: it, d: d + 1, p: np });
        }
        continue;
      }

      for (const k of Object.keys(o)) {
        const v = o[k];
        const np = `${p}.${k}`;
        if (match.test(k) && !ignore.test(k)) {
          const n = toNum(v);
          if (isPosNum(n)) return { value: n, path: np };
          if (v && typeof v === "object") {
            const f = findNumericInside(v, np);
            if (isPosNum(f.value)) return f;
          }
        }
        if (v && typeof v === "object") stack.push({ o: v, d: d + 1, p: np });
      }
    }
  } catch {}
  return { value: undefined, path: "" };
}

function deepFindTriggerInStrings(obj, { maxDepth = 4 } = {}, basePath = "order") {
  try {
    const stack = [{ o: obj, d: 0, p: basePath }];
    const seen = new Set();
    const trigWord = /trigger/i;
    while (stack.length) {
      const { o, d, p } = stack.pop();
      if (!o || typeof o !== "object" || seen.has(o) || d > maxDepth) continue;
      seen.add(o);

      if (Array.isArray(o)) {
        for (let i = 0; i < o.length; i++) {
          const it = o[i];
          const np = `${p}[${i}]`;
          if (typeof it === "string" && trigWord.test(it)) {
            const n = toNum(it);
            if (isPosNum(n)) return { value: n, path: np };
          } else if (it && typeof it === "object") {
            stack.push({ o: it, d: d + 1, p: np });
          }
        }
        continue;
      }

      for (const k of Object.keys(o)) {
        const v = o[k];
        const np = `${p}.${k}`;
        if (typeof v === "string" && trigWord.test(v)) {
          const n = toNum(v);
          if (isPosNum(n)) return { value: n, path: np };
        } else if (v && typeof v === "object") {
          stack.push({ o: v, d: d + 1, p: np });
        }
      }
    }
  } catch {}
  return { value: undefined, path: "" };
}

/* ---------- pickers ---------- */
function pickLimit(order) {
  const kind = getKind(order);
  const byKeys = pickByKeysWithPath(order, LIMIT_KEYS).value;

  // SL-M: no limit — show explicit limit only if present (rare), do not fall back to price
  if (kind.isSLM) return isPosNum(byKeys) ? byKeys : undefined;

  // SL-L: prefer explicit limit keys; if missing, some payloads put limit in "price"
  if (kind.isSLL) {
    if (isPosNum(byKeys)) return byKeys;
    const p = toNum(order.price);
    return isPosNum(p) ? p : undefined;
  }

  // Plain LIMIT or others: prefer explicit limit keys, else fall back to "price"
  if (isPosNum(byKeys)) return byKeys;
  const fallback = toNum(order.price);
  return isPosNum(fallback) ? fallback : undefined;
}

function pickAvg(order) {
  const byKeys = pickByKeysWithPath(order, ["limit_price", "limitPrice"]).value;
  if (isPosNum(byKeys)) return byKeys;
  const p = toNum(order.price);
  if (isPosNum(p)) return p;
  return undefined;
}

function pickTriggerDetailed(order) {
  const kind = getKind(order);

  // Direct and nested discovery first
  const direct = pickByKeysWithPath(order, TRIGGER_KEYS);
  if (isPosNum(direct.value)) return { ...direct, how: "direct" };

  const fromBox = pickFromKnownNestedContainers(order);
  if (isPosNum(fromBox.value)) return { ...fromBox, how: "nested-container" };

  const deepKey = deepFindNumberLikeKey(order);
  if (isPosNum(deepKey.value)) return { ...deepKey, how: "deep-key" };

  const deepText = deepFindTriggerInStrings(order);
  if (isPosNum(deepText.value)) return { ...deepText, how: "deep-text" };

  // Type-aware inference
  const priceVal = toNum(order.price);
  const limitVal =
    toNum(order.stoploss_limit) ??
    toNum(order.stop_limit_price) ??
    toNum(order.limit_price) ??
    toNum(order.limitPrice) ??
    undefined;
  const side = upper(order?.transaction_type || order?.side || "BUY");

  // SL-M: trigger = price (no limit)
  if (kind.isSLM && isPosNum(priceVal)) {
    return { value: priceVal, path: "inferred(price; SLM)", how: "inferred-SLM" };
  }

  // SL-L: do NOT infer trigger from price; only show if we truly found it above
  // If you must force a fallback, uncomment the line below (not recommended because it was wrong earlier)
  // if (kind.isSLL && isPosNum(priceVal) && isPosNum(limitVal)) return { value: side === "SELL" ? Math.min(priceVal, limitVal) : Math.max(priceVal, limitVal), path: "inferred(price,limit; SLL)", how: "inferred-SLL" };

  // For non-SL orders, no inference
  return { value: undefined, path: "", how: "" };
}

/* ---------- component ---------- */
export default function OpenOrderCard({ order, onModify, onCancel, onCancelConfirmed }) {
  const [showModal, setShowModal] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);

  const modalRoot = useMemo(() => {
    if (typeof document === "undefined") return null;
    return document.getElementById("modal-root") || document.body;
  }, []);

  if (!order) {
    return (
      <div className="open-card card-bordered">
        <div className="open-row center">
          <span className="no-data">No order data</span>
        </div>
      </div>
    );
  }

  const {
    transaction_type = "BUY",
    quantity = 0,
    filled_quantity = 0,
    symbol = "",
    status = "OPEN",
    exchange = "NFO",
    product_type = "MIS",
    order_type = "MARKET",
    isAMO = false,
    order_variety = "REGULAR",
    id,
    order_id,
  } = order;

  const exchangeColor = EXCHANGE_COLORS[upper(exchange)] || "#888";
  const displayStatus = isAMO || order_variety === "AMO" ? "SCHEDULED" : upper(status || "OPEN");

  const rowGap = 12;

  function renderCardAvgRow() {
    const avgForDisplay = pickAvg(order);
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: rowGap, marginBottom: rowGap }}>
        <span className="open-instrument" style={{ fontWeight: 700, fontSize: "1.09rem", flex: 1, textAlign: "left" }}>
          {order.symbol || symbol}
        </span>
        <span style={{ fontSize: "1.02rem", flex: 1, textAlign: "right", color: "#6B7280", fontWeight: 600 }}>
          Avg. <span style={{ fontWeight: 700, color: "#2D6CDF" }}>{formatNumber(avgForDisplay)}</span>
        </span>
      </div>
    );
  }

  function logDiagnostics(triggerPick, limitVal) {
    if (!window.__DEBUG_OPEN_ORDERS) return;
    const oid = order_id || id || order?.uid || "";
    const kind = getKind(order);
    if (isPosNum(triggerPick.value)) {
      console.log(
        `[OpenOrderCard] Trigger found for ${symbol || order.symbol || ""} (#${oid}):`,
        triggerPick.value,
        "via",
        triggerPick.how,
        "at",
        triggerPick.path,
        "| kind:",
        kind.txt
      );
    } else {
      console.warn(
        `[OpenOrderCard] No trigger found for ${symbol || order.symbol || ""} (#${oid}). kind: ${kind.txt}. Top-level keys:`,
        Object.keys(order || {})
      );
      const sample = {};
      for (const k of TRIGGER_KEYS) if (k in (order || {})) sample[k] = order[k];
      if (Object.keys(sample).length) console.warn("[OpenOrderCard] Top-level trigger-like raw values:", sample);
      console.warn("[OpenOrderCard] raw fields", {
        trigger_price: order.trigger_price,
        price: order.price,
        stoploss_limit: order.stoploss_limit,
        stop_limit_price: order.stop_limit_price,
        limit_price: order.limit_price,
        limitPrice: order.limitPrice,
        order_type: order.order_type,
        price_type: order.price_type,
        slActive: order.slActive,
        side: order.transaction_type || order.side,
      });
    }
    if (isPosNum(limitVal)) console.log(`[OpenOrderCard] Limit for ${symbol || order.symbol || ""} (#${oid}):`, limitVal);
  }

  function renderModalDetails() {
    const triggerPick = pickTriggerDetailed(order);
    const limitForDisplay = pickLimit(order);
    logDiagnostics(triggerPick, limitForDisplay);
    const triggerVal = triggerPick.value;

    return (
      <div style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottom: "1px solid #eee",
            marginBottom: 12,
            marginTop: 2,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#1326b5", letterSpacing: 0.2, textAlign: "left", lineHeight: 1.2 }}>
            {order.symbol || symbol}
          </span>

          <div style={{ textAlign: "right", lineHeight: 1.45 }}>
            <div style={{ fontWeight: 700, fontSize: "1.06rem", color: "#374151", letterSpacing: 0.1 }}>
              Trigger: <span style={{ fontWeight: 800, color: "#111827" }}>{isPosNum(triggerVal) ? formatCurrency(triggerVal) : "—"}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.06rem", color: "#374151", letterSpacing: 0.1, marginTop: 6 }}>
              Limit: <span style={{ fontWeight: 800, color: "#111827" }}>{isPosNum(limitForDisplay) ? formatCurrency(limitForDisplay) : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openActionsModal = () => {
    setConfirmMode(false);
    setShowModal(true);
  };
  const closeModal = () => {
    setConfirmMode(false);
    setShowModal(false);
  };

  const handleModify = () => {
    closeModal();
    if (onModify) onModify(order);
  };

  const handleCancelRequest = () => setConfirmMode(true);

  const handleCancelConfirm = async () => {
    try {
      if (typeof onCancelConfirmed === "function") await onCancelConfirmed(order);
      else if (typeof onCancel === "function") await onCancel(order, { confirmed: true });
    } finally {
      closeModal();
    }
  };

  const modalContent = showModal ? (
    <div className="open-modal-overlay" onClick={closeModal}>
      <div className="open-modal" onClick={(e) => e.stopPropagation()}>
        <div className="open-modal-content">
          {!confirmMode ? (
            <>
              {renderModalDetails()}
              <div
                className="open-modal-actions"
                style={{ marginTop: 8, display: "flex", flexDirection: "row", gap: "24px", width: "100%", justifyContent: "space-between" }}
              >
                <button
                  className="open-modify-btn"
                  style={{ background: "#1976d2", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "14px 38px", fontSize: "1.07rem", minWidth: 120 }}
                  onClick={handleModify}
                >
                  Modify
                </button>
                <button
                  className="open-cancel-btn"
                  style={{ background: "#e53935", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "14px 38px", fontSize: "1.07rem", minWidth: 120 }}
                  onClick={handleCancelRequest}
                >
                  Cancel
                </button>
              </div>
              <button
                className="open-close-btn"
                style={{ background: "#aaa", color: "#fff", fontWeight: 700, borderRadius: 6, padding: "10px 20px", minWidth: 90, margin: "18px 0 0 0", width: "100%", fontSize: "1.01rem" }}
                onClick={closeModal}
              >
                Close
              </button>
            </>
          ) : (
            <>
              <div className="open-modal-header">
                <span>Cancel Order</span>
              </div>
              <div className="open-modal-body" style={{ textAlign: "center", marginBottom: 12 }}>
                Are you sure you want to cancel this order?
              </div>
              <div className="open-modal-actions">
                <button className="open-cancel-btn" style={{ backgroundColor: "#22b573" }} onClick={handleCancelConfirm}>
                  OK
                </button>
                <button className="open-cancel-btn" onClick={() => setConfirmMode(false)}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className="open-card card-bordered"
        onClick={openActionsModal}
        tabIndex={0}
        role="button"
        style={{ cursor: "pointer" }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openActionsModal();
          }
        }}
      >
        {/* Top Row */}
        <div className="open-row" style={{ marginBottom: rowGap }}>
          <div className="open-row-left">
            <span className={`badge badge-type ${String(transaction_type).toLowerCase()}`}>{upper(transaction_type)}</span>
            <span className="open-qty">
              {filled_quantity}/{quantity}
            </span>
          </div>
          <div className="open-row-right">
            {(isAMO || order_variety === "AMO") && (
              <span className="badge badge-amo" style={{ marginRight: "7px" }}>
                AMO
              </span>
            )}
            <span className="badge badge-status-open">{displayStatus}</span>
          </div>
        </div>

        {/* Middle Row */}
        {renderCardAvgRow()}

        {/* Bottom Row */}
        <div className="open-row bottom-row" style={{ marginTop: rowGap, marginBottom: 0, paddingTop: 0 }}>
          <span className="open-exchange" style={{ background: "none", color: exchangeColor, border: "none", fontWeight: 700 }}>
            {upper(exchange)}
          </span>
          <div className="product-order-right">
            <span className={`product-type ${String(product_type).toLowerCase()}`}>{upper(product_type)}</span>
            <span className={`order-type ${String(order_type).toLowerCase()}`}>{upper(order_type)}</span>
          </div>
        </div>
      </div>
      {modalRoot && createPortal(modalContent, modalRoot)}
    </>
  );
}