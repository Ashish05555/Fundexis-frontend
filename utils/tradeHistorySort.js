// Converts any Firestore-ish timestamp to milliseconds.
// Handles: Timestamp.toMillis(), {seconds,nanoseconds}, {_seconds}, Date/string/number.
export function tsToMillis(ts) {
  if (!ts) return 0;

  // Firestore Timestamp object
  if (typeof ts?.toMillis === "function") {
    try {
      const ms = ts.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    } catch {
      // ignore
    }
  }

  // Firestore plain object shapes
  if (typeof ts === "object") {
    if (typeof ts.seconds === "number") {
      const ms = ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
      return Number.isFinite(ms) ? ms : 0;
    }
    if (typeof ts._seconds === "number") {
      const ms = ts._seconds * 1000;
      return Number.isFinite(ms) ? ms : 0;
    }
  }

  // ISO string or number
  if (typeof ts === "string") {
    const ms = Date.parse(ts);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof ts === "number") {
    // assume ms; if seconds-like, upscale
    return ts > 1e12 ? ts : ts * 1000;
  }

  return 0;
}

// Prefer an "end time" that marks when the trade finished.
// Statuses remain as-is: Completed = user-closed; Closed = auto square-off.
// This only unifies the timestamp used for sorting.
export function getTradeEndAtMillis(trade) {
  return (
    tsToMillis(trade.endedAt) ||
    tsToMillis(trade.completedAt) ||
    tsToMillis(trade.closedAt) ||
    tsToMillis(trade.archivedAt) ||
    tsToMillis(trade.exitDate) ||
    tsToMillis(trade.updatedAt) ||
    tsToMillis(trade.filledAt) ||
    tsToMillis(trade.openedAt) ||
    0
  );
}

// Sort newest finished first (top of Trade History)
export function sortTradesByLatestEnd(trades) {
  return [...(trades || [])].sort((a, b) => {
    const mb = getTradeEndAtMillis(b);
    const ma = getTradeEndAtMillis(a);
    if (mb !== ma) return mb - ma;
    // Fallback tie-break so order is stable if times equal/missing
    return String(b.id || "").localeCompare(String(a.id || ""));
  });
}