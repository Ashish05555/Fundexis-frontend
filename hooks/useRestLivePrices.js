import { useEffect, useState, useRef } from "react";

// tokens: array of instrument tokens you want prices for
export default function useRestLivePrices(tokens = [], interval = 500) {
  const [prices, setPrices] = useState({});
  const prevTokensRef = useRef(JSON.stringify(tokens));

  useEffect(() => {
    let timer;
    let cancelled = false;

    async function fetchAll() {
      try {
        if (!tokens.length) {
          setPrices({});
          return;
        }
        // Use API URL from environment variable, fallback to DigitalOcean IP
        const baseUrl = process.env.REACT_APP_API_URL || "http://159.65.157.202:3000";
        const url = `${baseUrl.replace(/\/$/, "")}/api/prices/batch?tokens=${tokens.join(",")}`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) return;

        const data = await res.json();

        // The backend returns:
        // {
        //   "738561": { "instrument_token": 738561, "last_price": 1398, "updated_at": 1760607782247 }
        // }
        const updated = {};
        tokens.forEach((token) => {
          const entry = data[String(token)];
          updated[String(token)] = {
            instrument_token: String(token),
            price:
              entry && entry.last_price !== undefined && entry.last_price !== null
                ? entry.last_price
                : null,
            updated_at: entry?.updated_at ?? null,
            // Optionally, attach the full entry for debugging
            raw: entry,
          };
        });

        if (!cancelled) setPrices(updated);
      } catch (e) {
        console.error("[useRestLivePrices] Fetch error:", e);
        const fallback = {};
        tokens.forEach((token) => {
          fallback[String(token)] = {
            instrument_token: String(token),
            price: null,
            error: "Fetch error",
          };
        });
        if (!cancelled) setPrices(fallback);
      }
    }

    fetchAll();
    timer = setInterval(fetchAll, interval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // Only re-run if token list or interval actually changes
  }, [JSON.stringify(tokens), interval]);

  // Extra: force refresh when tokens change, even if interval hasn't fired yet
  useEffect(() => {
    if (prevTokensRef.current !== JSON.stringify(tokens)) {
      prevTokensRef.current = JSON.stringify(tokens);
      setPrices({}); // clear stale prices immediately
    }
  }, [tokens]);

  return prices;
}