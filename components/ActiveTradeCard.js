import React from "react";

const EXCHANGE_COLORS = {
  NSE: "#e53935", // standard red
  BSE: "#1976d2", // standard blue
  NFO: "#888",    // standard gray
};

/* ------------ number helpers (kept same + currency) ------------ */
function formatNumber(num) {
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function formatCurrency(num) {
  if (!isPosNum(num)) return "—";
  return "₹" + Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
function upper(v, fb = "") {
  return String(v ?? fb).toUpperCase();
}

/* ------------ exchange + instrument (unchanged) ------------ */
// FIX: Always trust the trade.exchange field first if present and valid (NSE, BSE, NFO etc.)
// Only fallback to instrumentsMeta if trade.exchange is missing or empty.
function getExchange(trade, instrumentsMeta) {
  const raw = (trade.exchange || "").toUpperCase();
  if (["NSE", "BSE", "NFO"].includes(raw)) return raw;
  let symbol = trade.tradingsymbol || trade.symbol || "";
  let meta = instrumentsMeta?.find(
    (m) => m.tradingsymbol === symbol || m.symbol === symbol
  );
  if (meta && meta.exchange) return meta.exchange.toUpperCase();
  if (raw.includes("NSE")) return "NSE";
  if (raw.includes("BSE")) return "BSE";
  if (raw.includes("NFO")) return "NFO";
  return raw || "NSE";
}
function getInstrumentName(trade, instrumentsMeta) {
  let symbol = trade.tradingsymbol || trade.symbol || "";
  let meta = instrumentsMeta?.find(
    (m) => m.tradingsymbol === symbol || m.symbol === symbol
  );
  if (meta && meta.displayName) return meta.displayName;
  if (meta && meta.name) return meta.name;
  return symbol;
}

/* ==================================================================
   ActiveTradeModifyHeader
   - Use this inside your Active Trade "Modify" modal header (RIGHT SIDE).
   - It shows LTP, then Trigger (if applicable) and Limit stacked below,
     matching the style you liked in OpenOrderCard.
   - Everything else in your card/modal can remain unchanged.
   ================================================================== */

function getKind(order) {
  const ot = upper(order?.order_type || "");
  const pt = upper(order?.price_type || "");
  const txt = `${ot} ${pt}`;

  const isSLM = /\bSLM\b|\bSL-M\b/.test(txt);
  const isSLL =
    /\bSL[-_ ]?L(IMIT)?\b/.test(txt) ||
    (/\bSL\b/.test(txt) && !isSLM);

  const isPlainLimit = /\bLIMIT\b/.test(txt) || /\bLMT\b/.test(txt);
  return { isSLM, isSLL, isPlainLimit, txt };
}

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
  // uncommon
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
  // NOT including plain "price" here to avoid wrong mapping,
  // we'll handle "price" explicitly based on kind (SL-L / LIMIT).
  "price_per_unit",
];

const INNER_NUM_KEYS = [
  "price",
  "value",
  "amount",
  "val",
  "p",
  "trigger",
  "trigger_price",
  "stop_price",
];

function findNumericInside(container) {
  if (!container || typeof container !== "object") return undefined;
  for (const k of INNER_NUM_KEYS) {
    const n = toNum(container?.[k]);
    if (isPosNum(n)) return n;
  }
  for (const k of Object.keys(container)) {
    const n = toNum(container[k]);
    if (isPosNum(n)) return n;
  }
  return undefined;
}

function pickByKeys(obj, keys) {
  for (const k of keys) {
    const raw = obj?.[k];
    const n = toNum(raw);
    if (isPosNum(n)) return n;
    if (raw && typeof raw === "object") {
      const nested = findNumericInside(raw);
      if (isPosNum(nested)) return nested;
    }
  }
  return undefined;
}

// Limit detection aligned with OpenOrderCard rules
function pickLimit(trade) {
  const kind = getKind(trade);
  const byKeys = pickByKeys(trade, LIMIT_KEYS);

  if (kind.isSLM) return isPosNum(byKeys) ? byKeys : undefined;

  if (kind.isSLL) {
    if (isPosNum(byKeys)) return byKeys;
    const p = toNum(trade.price);
    return isPosNum(p) ? p : undefined;
  }

  if (isPosNum(byKeys)) return byKeys;
  // For plain LIMIT, most payloads use price as limit
  const fallback = toNum(trade.price);
  return isPosNum(fallback) ? fallback : undefined;
}

// Trigger detection aligned with OpenOrderCard rules (no wrong inference for SL-L)
function pickTrigger(trade) {
  const kind = getKind(trade);

  // 1) any explicit trigger-like field
  const direct = pickByKeys(trade, TRIGGER_KEYS);
  if (isPosNum(direct)) return direct;

  // 2) SL-M: trigger == price
  if (kind.isSLM) {
    const p = toNum(trade.price);
    if (isPosNum(p)) return p;
  }

  // 3) SL-L and others: do NOT infer from price
  return undefined;
}

/**
 * Renders "LTP, Trigger, Limit" stacked block for the Active Trade modify modal.
 * Place it on the RIGHT side of your modal header (where you currently show LTP).
 */
export function ActiveTradeModifyHeader({ trade, ltp }) {
  const ltpVal =
    toNum(ltp) ??
    toNum(trade?.ltp) ??
    toNum(trade?.livePrice) ??
    toNum(trade?.last_price);

  const triggerVal = pickTrigger(trade);
  const limitVal = pickLimit(trade);

  const kind = getKind(trade);
  const showTrigger = kind.isSLM || kind.isSLL || isPosNum(triggerVal);

  return (
    <div style={{ textAlign: "right", lineHeight: 1.45 }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: "1.06rem",
          color: "#22b573", // green-ish for LTP
          letterSpacing: 0.1,
        }}
      >
        LTP:{" "}
        <span style={{ fontWeight: 800, color: "#22b573" }}>
          {isPosNum(ltpVal) ? formatCurrency(ltpVal) : "—"}
        </span>
      </div>

      {showTrigger && (
        <div
          style={{
            fontWeight: 700,
            fontSize: "1.06rem",
            color: "#374151",
            letterSpacing: 0.1,
            marginTop: 6,
          }}
        >
          Trigger:{" "}
          <span style={{ fontWeight: 800, color: "#111827" }}>
            {isPosNum(triggerVal) ? formatCurrency(triggerVal) : "—"}
          </span>
        </div>
      )}

      <div
        style={{
          fontWeight: 700,
          fontSize: "1.06rem",
          color: "#374151",
          letterSpacing: 0.1,
          marginTop: 6,
        }}
      >
        Limit:{" "}
        <span style={{ fontWeight: 800, color: "#111827" }}>
          {isPosNum(limitVal) ? formatCurrency(limitVal) : "—"}
        </span>
      </div>
    </div>
  );
}

/* ==================================================================
   ActiveTradeCard (unchanged visual card)
   - This stays as-is and continues to call onCardClick(trade) on click.
   - Use <ActiveTradeModifyHeader /> inside your modify modal (not here).
   ================================================================== */
export default function ActiveTradeCard({ trade, instrumentsMeta, onCardClick }) {
  const ltp = trade.ltp ?? trade.price ?? 0;
  const entryPrice = trade.price ?? 0;
  const qty = trade.quantity ?? 0;
  const pnl = trade.pnl ?? 0;

  const productType = (trade.product_type || trade.order_type || "MIS").toUpperCase();
  const exchange = getExchange(trade, instrumentsMeta);
  const exchangeColor = EXCHANGE_COLORS[exchange] || "#888";
  const instrumentName = getInstrumentName(trade, instrumentsMeta);

  let pnlText = "";
  if (pnl > 0) pnlText = "+" + formatNumber(pnl);
  else if (pnl < 0) pnlText = "-" + formatNumber(Math.abs(pnl));
  else pnlText = formatNumber(pnl);

  // Show GTT badge if this trade originated from a GTT order (gtt: true or type: "GTT")
  const isGTT = trade.gtt === true || trade.type === "GTT";

  return (
    <div className="trade-card card-bordered" onClick={() => onCardClick && onCardClick(trade)}>
      <div className="trade-row trade-top">
        <div className="trade-top-left">
          <span className="trade-qty">
            Qty.<b>{qty}</b>
          </span>
          <span className="trade-avg">
            Avg.<b>{formatNumber(entryPrice)}</b>
          </span>
        </div>
        <span className={`trade-type-badge ${productType.toLowerCase()}`}>{productType}</span>
      </div>

      <div className="trade-row trade-middle">
        <span className="trade-instrument">{instrumentName}</span>
        <span className={`trade-pnl ${pnl >= 0 ? "pnl-green" : "pnl-red"}`}>{pnlText}</span>
      </div>

      <div className="trade-row trade-bottom">
        <span
          className="trade-exchange"
          style={{
            color: exchangeColor,
            fontWeight: 700,
            fontSize: "15px",
            minWidth: "44px",
            background: "none",
            border: "none",
            display: "inline-block",
            verticalAlign: "middle",
          }}
        >
          {exchange}
        </span>

        {/* GTT badge, if applicable */}
        {isGTT && (
          <span
            className="gtt-badge"
            style={{
              background: "#1646b6",
              color: "#fff",
              fontSize: "12px",
              borderRadius: "5px",
              padding: "0px 6px",
              marginLeft: "6px",
              display: "inline-block",
              fontWeight: 700,
              height: "18px",
              lineHeight: "18px",
              verticalAlign: "middle",
            }}
          >
            GTT
          </span>
        )}

        <span className="trade-ltp-group">
          <span className="trade-ltp-label">LTP</span>
          <span className="trade-ltp">{formatNumber(ltp)}</span>
        </span>
      </div>
    </div>
  );
}

/* ==================================================================
   How to use in your modify modal:

   import ActiveTradeCard, { ActiveTradeModifyHeader } from "./ActiveTradeCard";

   // Inside your modify modal header:
   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
     <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#1326b5" }}>
       {trade.symbol || trade.tradingsymbol || ""}
     </span>
     <ActiveTradeModifyHeader trade={trade} ltp={liveLtpValue} />
   </div>

   - The rest of your modal (Stop Loss, Trigger inputs, buttons) stays the same.
   - For SL-L orders, Trigger shows only if trigger_price exists on the trade object.
     If your backend doesn’t echo it, stash it client-side when placing the order
     and merge it back for display (same approach as discussed for OpenOrderCard).
   ================================================================== */