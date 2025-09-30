import React from "react";

const EXCHANGE_COLORS = {
  NSE: "#e53935", // red
  BSE: "#1976d2", // blue
  NFO: "#888888", // gray
};

function toNumRaw(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const s = v.replace(/[,\s₹INR]/gi, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function toNum(v, fallback = 0) {
  const n = toNumRaw(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(num) {
  const n = toNum(num, 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function sideUpper(v) {
  return String(v ?? "BUY").toUpperCase();
}

function normalizeExchange(ex) {
  const e = String(ex || "").toUpperCase();
  if (e === "NSE" || e === "BSE" || e === "NFO") return e;
  return "NSE";
}

/**
 * TradeHistoryCard
 * - Exit price prefers exit_price/exitPrice/closedPrice/completedPrice.
 * - P&L prefers backend pnl/realizedPnl; else computes from (exit - entry) * qty (SELL inverted).
 * - Shows + sign for non-negative values.
 * - Handles COMPLETED (auto/forced) and CLOSED (manual) statuses.
 */
export default function TradeHistoryCard({ trade }) {
  // Safe reads and normalization
  const exchange = normalizeExchange(trade?.exchange ?? trade?.exch ?? "NSE");
  const exchangeColor = EXCHANGE_COLORS[exchange] || "#1976d2";
  const instrumentName =
    trade?.instrumentName || trade?.tradingsymbol || trade?.symbol || "";

  const qty = toNum(trade?.quantity, 0);

  // Entry price: prefer entry_price/avg_price; fallback to price
  const entry = toNum(
    trade?.entry_price ?? trade?.avg_price ?? trade?.price,
    0
  );

  // Exit price: prioritize actual exit fields, fallback to entry only if missing
  const exitPrice = toNum(
    trade?.exit_price ?? trade?.exitPrice ?? trade?.closedPrice ?? trade?.completedPrice,
    entry
  );

  // Side and P&L
  const S = sideUpper(trade?.side ?? trade?.transaction_type);

  // Prefer backend-calculated pnl/realizedPnl if available, else compute
  let pnl;
  if (typeof trade?.pnl === "number") {
    pnl = trade.pnl;
  } else if (typeof trade?.realizedPnl === "number") {
    pnl = trade.realizedPnl;
  } else {
    pnl = S === "BUY" ? (exitPrice - entry) * qty : (entry - exitPrice) * qty;
  }

  // P&L text with + for zero/non-negative
  const pnlText = (pnl >= 0 ? "+" : "-") + formatNumber(Math.abs(pnl));

  // Status badge (robust to casing)
  const statusRaw = String(trade?.status || "").toUpperCase();
  let statusLabel = "";
  let statusColor = "";
  if (statusRaw === "CLOSED") {
    statusLabel = "Closed";          // manual close
    statusColor = "#e66d00";
  } else if (statusRaw === "COMPLETED") {
    statusLabel = "Completed";       // auto square-off or forced close
    statusColor = "#1976d2";
  }

  const pnlPositiveOrZero = pnl >= 0;

  return (
    <div
      className="trade-card card-bordered"
      style={{
        position: "relative",
        marginBottom: 22, // <--- Add space between cards!
      }}
    >
      {/* Status badge */}
      {statusLabel && (
        <span
          style={{
            position: "absolute",
            top: 14,
            right: 18,
            fontSize: "0.87em",
            fontWeight: 600,
            color: "#fff",
            background: statusColor,
            borderRadius: "7px",
            padding: "2px 14px",
            zIndex: 2,
            letterSpacing: "0.2px",
            border: "1px solid #e3e3f4",
            boxShadow: "0 1px 4px #ececec3b",
          }}
        >
          {statusLabel}
        </span>
      )}

      {/* Top row: Qty, Avg */}
      <div className="trade-row trade-top">
        <div className="trade-top-left">
          <span className="trade-qty">
            Qty.<b>{qty}</b>
          </span>
          <span className="trade-avg">
            Avg.<b>{formatNumber(entry)}</b>
          </span>
        </div>
      </div>

      {/* Middle row: Instrument, P&L */}
      <div className="trade-row trade-middle">
        <span className="trade-instrument">{instrumentName}</span>
        <span className={`trade-pnl ${pnlPositiveOrZero ? "pnl-green" : "pnl-red"}`}>
          {pnlText}
        </span>
      </div>

      {/* Bottom row: Exchange, Exit Price */}
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
            letterSpacing: "0.08em",
          }}
        >
          {exchange}
        </span>
        <span className="trade-ltp-group" style={{ marginLeft: "auto" }}>
          <span className="trade-ltp-label">Exit Price</span>
          <span className="trade-ltp" style={{ fontWeight: "bold", marginLeft: "3px" }}>
            {formatNumber(exitPrice)}
          </span>
        </span>
      </div>
    </div>
  );
}