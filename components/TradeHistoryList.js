import React from "react";
import TradeHistoryCard from "./TradeHistoryCard";

// Helpers
function toNumRaw(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const s = v.replace(/[,\s₹INR]/gi, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}
function toNum(v, fb = 0) {
  const n = toNumRaw(v);
  return Number.isFinite(n) ? n : fb;
}
function sideUpper(v) {
  return String(v ?? "BUY").toUpperCase();
}
function toDateSafe(v) {
  try {
    if (!v) return null;
    if (typeof v.toDate === "function") return v.toDate();
    if (typeof v === "object" && typeof v.seconds === "number") {
      return new Date(v.seconds * 1000);
    }
    return new Date(v);
  } catch {
    return null;
  }
}

// Compute best timestamp for sorting/display
function getWhen(trade) {
  return (
    toDateSafe(trade?.closedAt) ||
    toDateSafe(trade?.completedAt) ||
    toDateSafe(trade?.updatedAt) ||
    toDateSafe(trade?.createdAt) ||
    null
  );
}

// Compute PnL if backend didn't provide one
function computePnl(trade) {
  if (typeof trade?.pnl === "number") return trade.pnl;
  if (typeof trade?.realizedPnl === "number") return trade.realizedPnl;

  const qty = toNum(trade?.quantity, 0);
  const entry = toNum(trade?.entry_price ?? trade?.avg_price ?? trade?.price, 0);
  const exit =
    toNum(trade?.exit_price ?? trade?.exitPrice ?? trade?.closedPrice ?? trade?.completedPrice, entry);
  const S = sideUpper(trade?.side ?? trade?.transaction_type);

  if (S === "SELL") return (entry - exit) * qty;
  return (exit - entry) * qty;
}

export default function TradeHistoryList({ trades = [] }) {
  // Normalize status filtering
  const historyTrades = (trades || []).filter((trade) => {
    const s = String(trade?.status || "").toUpperCase();
    return s === "COMPLETED" || s === "CLOSED";
  });

  // Sort by when (desc)
  const sorted = historyTrades
    .slice()
    .sort((a, b) => {
      const da = getWhen(a)?.getTime?.() || 0;
      const db = getWhen(b)?.getTime?.() || 0;
      return db - da;
    })
    // ensure pnl presence so UI relying on raw list can also sum if needed
    .map((t) => ({
      ...t,
      pnl: computePnl(t),
    }));

  return (
    <div className="trade-history-list">
      <h3>Trade History</h3>
      {sorted.length === 0 ? (
        <div>No trade history</div>
      ) : (
        <div className="trade-history-grid" style={{ display: "grid", gap: 10 }}>
          {sorted.map((trade) => (
            <TradeHistoryCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}