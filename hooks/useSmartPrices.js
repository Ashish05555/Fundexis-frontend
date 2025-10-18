// src/hooks/useSmartPrices.js
import { useEffect, useMemo, useRef, useState } from "react";
import useRestLivePrices from "./useRestLivePrices";

// IST window
const MARKET_OPEN_IST = { hour: 9, minute: 15 };
const MARKET_CLOSE_IST = { hour: 15, minute: 30 };

function getISTNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}
function isMarketOpenIST(istNow) {
  const open = new Date(istNow);
  open.setHours(MARKET_OPEN_IST.hour, MARKET_OPEN_IST.minute, 0, 0);
  const close = new Date(istNow);
  close.setHours(MARKET_CLOSE_IST.hour, MARKET_CLOSE_IST.minute, 0, 0);
  const day = istNow.getDay();
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && istNow >= open && istNow <= close;
}

function joinUrl(base, path) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

async function fetchLastPrices({ baseUrl, tokens, path = "/market/last-prices" }) {
  if (!baseUrl || !tokens?.length) return {};
  const url = joinUrl(baseUrl, path) + `?tokens=${encodeURIComponent(tokens.join(","))}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  // Expect { [token]: { price } } but normalize common shapes too
  const out = {};
  if (Array.isArray(data)) {
    for (const row of data) {
      const t = String(row.instrument_token ?? row.token ?? "");
      const price = row.price ?? row.last_price ?? row.ltp ?? row.close ?? null;
      if (t) out[t] = { price };
    }
  } else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v === "object") {
        out[String(k)] = { price: v.price ?? v.last_price ?? v.ltp ?? v.close ?? null };
      } else {
        out[String(k)] = { price: v };
      }
    }
  }
  return out;
}

/**
 * useSmartPrices
 * - tokens: string[] of instrument tokens
 * - marketOpen: optional boolean override; otherwise uses IST time window
 * - baseUrl: your Cloud Run base (e.g., EXPO_PUBLIC_API_BASE_URL)
 * - lastPath: path to last-prices endpoint (default "/market/last-prices")
 * - liveInterval: ms for live polling (when market is open)
 * - lastInterval: ms for last-prices polling (when market is closed)
 */
export default function useSmartPrices({
  tokens = [],
  marketOpen: marketOpenOverride,
  baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL,
  lastPath = "/market/last-prices",
  liveInterval = 1000,
  lastInterval = 60_000,
}) {
  const [nowOpen, setNowOpen] = useState(() => isMarketOpenIST(getISTNow()));
  const [lastMap, setLastMap] = useState({});
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Auto IST detector if not overridden
  useEffect(() => {
    if (typeof marketOpenOverride === "boolean") return;
    const tick = () => setNowOpen(isMarketOpenIST(getISTNow()));
    const id = setInterval(tick, 30_000);
    tick();
    return () => clearInterval(id);
  }, [marketOpenOverride]);

  const effectiveOpen = typeof marketOpenOverride === "boolean" ? marketOpenOverride : nowOpen;

  // Live poll during open
  const liveMap = useRestLivePrices(tokens, liveInterval);

  // Last prices during close
  useEffect(() => {
    if (effectiveOpen) return;
    if (!tokens?.length) { setLastMap({}); return; }

    let stop = false;
    async function runOnce() {
      try {
        const data = await fetchLastPrices({ baseUrl, tokens, path: lastPath });
        if (!stop && mountedRef.current) setLastMap(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.warn("[useSmartPrices] last-prices fetch failed:", e?.message, { baseUrl, lastPath });
        // keep previous lastMap
      }
    }
    runOnce();
    const id = setInterval(runOnce, lastInterval);
    return () => { stop = true; clearInterval(id); };
  }, [effectiveOpen, tokens.join(","), baseUrl, lastPath, lastInterval]);

  return useMemo(() => (effectiveOpen ? (liveMap || {}) : (lastMap || {})), [effectiveOpen, liveMap, lastMap]);
}