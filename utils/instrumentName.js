// Human-readable instrument names similar to Zerodha, plus helpers to
// build compact and two-line display parts for list items.
//
// Exports:
// - formatInstrumentName(instrument)
// - buildSearchKeywords(instrument)
// - getTwoLineParts(instrument): { line1, line2, weekly, meta }
//
// Behavior notes:
// - Options weekly vs monthly is a best-effort heuristic using expiry date:
//   weekly => show "DD MON (W)"
//   monthly or unknown day => show "MON"
// - For F&O that can't be parsed confidently, fall back to raw tradingsymbol,
//   not a vague underlying-only label.

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function pad2(n) { return String(n).padStart(2, "0"); }
function ordinal(n) {
  const s = ["th","st","nd","rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
function monthShortFromNumber(m1to12) {
  const idx = (Number(m1to12) || 0) - 1;
  return MONTHS[idx] || "";
}
function monthNumberFromShort(mon) {
  const up = String(mon || "").slice(0,3).toUpperCase();
  const idx = MONTHS.indexOf(up);
  return idx === -1 ? undefined : idx + 1;
}
function lastWeekdayOfMonth(year, monthIndex0, weekdayIndex0) {
  const last = new Date(year, monthIndex0 + 1, 0);
  const diff = (last.getDay() - weekdayIndex0 + 7) % 7;
  return new Date(year, monthIndex0 + 1, last.getDate() - diff);
}
// Heuristic: treat expiry that equals last Wed/Thu/Fri of month as monthly.
function isLikelyMonthlyExpiry(expiryDate) {
  if (!(expiryDate instanceof Date) || isNaN(expiryDate)) return false;
  const y = expiryDate.getFullYear();
  const m = expiryDate.getMonth();
  const d = expiryDate.getDate();
  const lastWed = lastWeekdayOfMonth(y, m, 3).getDate();
  const lastThu = lastWeekdayOfMonth(y, m, 4).getDate();
  const lastFri = lastWeekdayOfMonth(y, m, 5).getDate();
  return d === lastWed || d === lastThu || d === lastFri;
}

// Attempt to parse common NSE futures/options trading symbol patterns.
// Handles e.g.:
// - NIFTY2590922600CE -> YY M DD STRIKE CE (weekly)
// - NIFTY250922600CE  -> YY MM STRIKE CE (monthly)
// - NIFTY25SEP22600CE -> YY MON STRIKE CE (monthly)
// - NIFTY25SEP0922600CE -> YY MON DD STRIKE CE (weekly)
// - NIFTY25NOVFUT, NIFTY2509FUT, NIFTY25SEPFUT
//
// Note: If we can't parse month/day, we still mark OPT/FUT based on type or suffix.
function parseFromTradingSymbol(raw) {
  const tradingSymbol = String(raw || "").toUpperCase().replace(/\s+/g, "");
  if (!tradingSymbol) return {};

  const mPrefix = tradingSymbol.match(/^([A-Z\-]+)(.*)$/);
  if (!mPrefix) return {};
  const underlying = mPrefix[1];
  const rest = mPrefix[2];

  // FUT patterns
  {
    // UNDERLYING + YY + MM + FUT
    let m = rest.match(/^(\d{2})(\d{2})FUT$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      return { type: "FUT", underlying, year: 2000 + yy, month: mm };
    }
    // UNDERLYING + YY + MON + FUT
    m = rest.match(/^(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)FUT$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mon = monthNumberFromShort(m[2]);
      return { type: "FUT", underlying, year: 2000 + yy, month: mon };
    }
  }

  // OPT patterns
  {
    // YY M DD STRIKE (CE|PE)  — month can be 1 or 2 digits
    let m = rest.match(/^(\d{2})(\d{1,2})(\d{2})(\d+)(CE|PE)$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mn = parseInt(m[2], 10);
      const dd = parseInt(m[3], 10);
      return { type: "OPT", underlying, year: 2000 + yy, month: mn, day: dd, strike: m[4], opt: m[5].toUpperCase() };
    }
    // YY MM STRIKE (CE|PE) — monthly (no day)
    m = rest.match(/^(\d{2})(\d{2})(\d+)(CE|PE)$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      return { type: "OPT", underlying, year: 2000 + yy, month: mm, strike: m[3], opt: m[4].toUpperCase() };
    }
    // YY MON DD STRIKE (CE|PE)
    m = rest.match(/^(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2})(\d+)(CE|PE)$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mon = monthNumberFromShort(m[2]);
      const dd = parseInt(m[3], 10);
      return { type: "OPT", underlying, year: 2000 + yy, month: mon, day: dd, strike: m[4], opt: m[5].toUpperCase() };
    }
    // YY MON STRIKE (CE|PE)
    m = rest.match(/^(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d+)(CE|PE)$/i);
    if (m) {
      const yy = parseInt(m[1], 10);
      const mon = monthNumberFromShort(m[2]);
      return { type: "OPT", underlying, year: 2000 + yy, month: mon, strike: m[3], opt: m[4].toUpperCase() };
    }
  }

  return { underlying };
}

function coerceDateFromParts({ year, month, day }) {
  if (!year || !month) return undefined;
  const d = new Date(year, month - 1, day || 1);
  return isNaN(d) ? undefined : d;
}

function normalizeInstrumentMeta(instrument = {}) {
  const expiryRaw =
    instrument.expiry ||
    instrument.expiry_date ||
    instrument.expiryDate ||
    instrument.last_trading_date ||
    instrument.lastTradingDate ||
    instrument.expiry_dt;

  let expiryDate;
  if (expiryRaw) {
    const d = new Date(expiryRaw);
    if (!isNaN(d)) expiryDate = d;
  }

  const ts =
    instrument.trading_symbol ||
    instrument.tradingsymbol ||
    instrument.symbol ||
    instrument.name ||
    "";

  const parsed = parseFromTradingSymbol(ts);

  if (!expiryDate && parsed.year && parsed.month) {
    expiryDate = coerceDateFromParts(parsed);
  }

  const underlying =
    parsed.underlying ||
    instrument.underlying ||
    String(ts).replace(/[^A-Z\-]/g, "") ||
    "";

  const strike =
    instrument.strike ||
    instrument.strike_price ||
    instrument.strikePrice ||
    parsed.strike;

  const opt =
    instrument.option_type ||
    instrument.optionType ||
    instrument.right ||
    parsed.opt;

  const instrumentType = String(instrument.instrument_type || instrument.type || "").toUpperCase();

  const isOption =
    instrumentType.includes("OPT") ||
    !!opt ||
    /CE|PE$/.test(String(ts).toUpperCase());

  const isFut =
    instrumentType.includes("FUT") ||
    /FUT$/.test(String(ts).toUpperCase()) ||
    parsed.type === "FUT";

  let month = parsed.month;
  let day = parsed.day;
  let year = parsed.year;
  if (expiryDate) {
    month = expiryDate.getMonth() + 1;
    day = expiryDate.getDate();
    year = expiryDate.getFullYear();
  }

  return {
    underlying,
    isOption,
    isFut,
    strike: strike ? String(strike) : undefined,
    opt: opt ? String(opt).toUpperCase() : undefined,
    month,
    day,
    year,
    expiryDate,
  };
}

function formatOptionName(meta, { includeOrdinal = true, includeWeeklyTag = true } = {}) {
  const u = meta.underlying || "";
  const mon = monthShortFromNumber(meta.month);
  const strike = meta.strike ? String(meta.strike) : "";
  const right = meta.opt || "";
  if (!u || !mon || !strike || !right) return null;

  const monthly = isLikelyMonthlyExpiry(meta.expiryDate);
  const hasDay = !!meta.day;

  if (monthly || !hasDay) {
    // Monthly style
    return `${u} ${mon} ${strike} ${right}`;
  } else {
    // Weekly style
    const dayStr = includeOrdinal ? `${meta.day}${ordinal(meta.day)}` : String(meta.day);
    const w = includeWeeklyTag ? " W" : "";
    return `${u} ${dayStr}${w} ${mon} ${strike} ${right}`;
  }
}

function formatFutName(meta) {
  const u = meta.underlying || "";
  const mon = monthShortFromNumber(meta.month);
  if (!u || !mon) return null;
  return `${u} ${mon} FUT`;
}

export function formatInstrumentName(instrument, opts) {
  const meta = normalizeInstrumentMeta(instrument);

  if (meta.isOption) {
    const name = formatOptionName(meta, opts);
    if (name) return name;
  }
  if (meta.isFut) {
    const name = formatFutName(meta);
    if (name) return name;
  }

  // Fallbacks:
  const ts =
    instrument.tradingsymbol ||
    instrument.trading_symbol ||
    instrument.symbol ||
    "";

  // If this is F&O but we couldn't parse, prefer the raw code instead of generic "NIFTY"
  if (meta.isOption || meta.isFut) {
    return ts || instrument.display_name || instrument.name || "";
  }

  // Equities: user-friendly name if present
  return (
    instrument.display_name ||
    instrument.name ||
    ts
  );
}

// Build keywords for search recall
export function buildSearchKeywords(instrument) {
  const meta = normalizeInstrumentMeta(instrument);
  const tokens = new Set();

  const raw = String(
    instrument.trading_symbol ||
    instrument.tradingsymbol ||
    instrument.symbol ||
    instrument.name ||
    ""
  ).toUpperCase();
  if (raw) tokens.add(raw);

  const disp = formatInstrumentName(instrument) || "";
  if (disp) {
    tokens.add(disp.toUpperCase());
    disp.split(/\s+/).forEach((t) => t && tokens.add(t.toUpperCase()));
  }

  if (meta.underlying) tokens.add(meta.underlying.toUpperCase());
  if (meta.strike) tokens.add(String(meta.strike).toUpperCase());
  if (meta.opt) tokens.add(meta.opt.toUpperCase());
  const mon = monthShortFromNumber(meta.month);
  if (mon) tokens.add(mon.toUpperCase());
  if (meta.day) {
    tokens.add(String(meta.day).toUpperCase());
    tokens.add(pad2(meta.day).toUpperCase());
    tokens.add(`${meta.day}${ordinal(meta.day)}`.toUpperCase());
  }

  return Array.from(tokens);
}

// Returns parts for a two-line list layout.
// - line1 (primary): "UNDERLYING 22600 CE" or "UNDERLYING FUT" or equity name/symbol
// - line2 (secondary): "09 SEP" or "SEP" (weekly tag handled by caller with (W))
// - weekly: boolean (true when we think it's a weekly expiry)
// - meta: the normalized metadata (in case callers need it)
export function getTwoLineParts(instrument) {
  const meta = normalizeInstrumentMeta(instrument);

  // Equity
  if (!meta.isOption && !meta.isFut) {
    const line1 =
      instrument.display_name ||
      instrument.name ||
      instrument.tradingsymbol ||
      instrument.trading_symbol ||
      instrument.symbol ||
      "";
    return { line1, line2: "", weekly: false, meta };
  }

  // Option
  if (meta.isOption) {
    const u = meta.underlying || "";
    const strike = meta.strike ? String(meta.strike) : "";
    const right = meta.opt || "";
    const line1 = [u, strike, right].filter(Boolean).join(" ").trim();

    const mon = monthShortFromNumber(meta.month);
    const monthly = isLikelyMonthlyExpiry(meta.expiryDate) || !meta.day;
    let line2 = "";
    let weekly = false;

    if (monthly || !meta.day) {
      // monthly or unknown day -> "SEP"
      line2 = mon || "";
      weekly = false;
    } else {
      // weekly -> "09 SEP"
      line2 = `${meta.day} ${mon}`.trim();
      weekly = true;
    }

    return { line1: line1 || (instrument.tradingsymbol || instrument.symbol || ""), line2, weekly, meta };
  }

  // Future
  if (meta.isFut) {
    const u = meta.underlying || "";
    const line1 = `${u} FUT`.trim();
    const mon = monthShortFromNumber(meta.month);
    return { line1: line1 || (instrument.tradingsymbol || instrument.symbol || ""), line2: mon || "", weekly: false, meta };
  }

  // Fallback
  return {
    line1: instrument.tradingsymbol || instrument.trading_symbol || instrument.symbol || "",
    line2: "",
    weekly: false,
    meta,
  };
}