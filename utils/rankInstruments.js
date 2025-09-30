// Relevance ranking for instruments + exchange color helper

export const NSE_RED = "#ef5350"; // soft red, not too hard
// Keep your existing blue for BSE from theme.brand wherever you render

const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s = "") => s.toString().trim().toLowerCase();

/**
 * A base key to cluster cross-exchange duplicates near each other.
 * Prefer symbol; fall back to name without whitespace.
 */
const baseKey = (inst = {}) => {
  const symbol = norm(inst.symbol || inst.tradingsymbol || inst.ticker || "");
  const name = norm(inst.name || inst.companyName || "");
  return symbol || name.replace(/\s+/g, "");
};

const exch = (inst = {}) =>
  (inst.exchange || inst.exch || inst.segment || "").toString().toUpperCase();

/**
 * Compute a score for how well an instrument matches the query.
 * Heavily boosts exact/prefix matches on symbol and name.
 */
export function scoreInstrument(query, inst) {
  const q = norm(query);
  if (!q) return 0;

  const symbol = norm(inst.symbol || inst.tradingsymbol || inst.ticker || "");
  const name = norm(inst.name || inst.companyName || "");

  let score = 0;

  // Exact matches
  if (symbol === q) score += 1000;
  if (name === q) score += 900;

  // Prefix matches
  if (symbol.startsWith(q)) score += 750;
  if (name.startsWith(q)) score += 650;

  // Whole-word match in name
  if (name && new RegExp(`\\b${escapeRegExp(q)}\\b`, "i").test(name)) {
    score += 500;
  }

  // Substring matches
  if (symbol.includes(q)) score += 400;
  if (name.includes(q)) score += 350;

  // Token coverage bonus for multi-word queries
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    let covered = 0;
    for (const t of tokens) {
      if (symbol.includes(t) || name.includes(t)) covered++;
    }
    score += covered * 40;
  }

  // Prefer simple equity types if your data has instrument_type/segment
  const type = (inst.instrument_type || inst.type || inst.segment || "").toUpperCase();
  if (/(^|[^A-Z])EQ($|[^A-Z])/.test(type)) score += 40;

  // Small tie-breaker: shorter delta between symbol and query
  if (symbol) score -= Math.abs(symbol.length - q.length) * 2;

  return score;
}

/**
 * Rank and (optionally) limit instruments by relevance.
 * - preferNSEWithinPair keeps NSE slightly ahead of BSE when two rows represent the same symbol/name.
 */
export function rankAndFilterInstruments(query, instruments = [], opts = {}) {
  const { limit = undefined, preferNSEWithinPair = true } = opts;
  const q = norm(query);
  if (!q) return [];

  const scored = instruments
    .map((inst) => ({
      inst,
      score: scoreInstrument(q, inst),
      key: baseKey(inst),
      ex: exch(inst),
    }))
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    // Cluster cross-exchange twins together; optionally keep NSE first within the pair
    if (a.key && b.key && a.key === b.key) {
      if (preferNSEWithinPair) {
        const order = (ex) => (ex === "NSE" ? 0 : ex === "BSE" ? 1 : 2);
        const d = order(a.ex) - order(b.ex);
        if (d !== 0) return d;
      }
    }

    // Stable fallback by symbol/name
    return a.key.localeCompare(b.key);
  });

  const result = scored.map((x) => x.inst);
  return typeof limit === "number" ? result.slice(0, limit) : result;
}

/**
 * Exchange color helper
 * Use theme.brand (your current blue) for BSE; soft red for NSE.
 */
export function getExchangeColor(exchange, theme) {
  const ex = (exchange || "").toString().toUpperCase();
  if (ex === "NSE") return NSE_RED;
  if (ex === "BSE") return theme?.brand || "#2D6CDF"; // fallback blue
  return theme?.sectionTitle || "#888";
}