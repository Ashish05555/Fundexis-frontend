// Generic helpers to decide which product types are allowed for an instrument/order

export function isEquityInstrument(meta = {}) {
  const exchange = String(meta.exchange || "").toUpperCase();
  const segment = String(meta.segment || meta.instrument_type || "").toUpperCase();
  const tradingSymbol = String(meta.trading_symbol || meta.symbol || "").toUpperCase();

  // If explicitly derivatives, it's not equity
  if (exchange === "NFO" || segment.includes("FUT") || segment.includes("OPT") || segment.includes("FO")) {
    return false;
  }

  // If classic stock exchanges and not marked futures/options, treat as equity
  if (exchange === "NSE" || exchange === "BSE") return true;

  // Heuristic fallback: common "-EQ" suffix means cash-equity in many symbol codings
  if (tradingSymbol.endsWith("-EQ")) return true;

  // Default to equity only if nothing indicates derivatives
  return !segment;
}

export function getAllowedProducts(meta = {}) {
  return isEquityInstrument(meta) ? ["MIS"] : ["MIS", "NRML"];
}