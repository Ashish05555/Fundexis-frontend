import { useEffect, useState } from "react";

// tokens: array of instrument tokens you want live prices for
export default function useRestLivePrices(tokens = [], interval = 1000) {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    let timer;
    let cancelled = false;

    async function fetchAll() {
      const updated = {};
      await Promise.all(
        tokens.map(async (token) => {
          try {
            const res = await fetch(
              `https://fundexis-backend-758832599619.us-central1.run.app/api/prices/${token}`
            );
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.last_price !== undefined) {
              updated[token] = {
                instrument_token: token,
                price: data.last_price,
                symbol: data.tradingsymbol || data.symbol || "",
                bid: data.depth?.buy?.[0]?.price ?? "",
                ask: data.depth?.sell?.[0]?.price ?? "",
                volume: data.volume || "",
                timestamp: data.timestamp || data.last_trade_time || "",
              };
            }
          } catch (e) {
            // Optionally log or handle error
          }
        })
      );
      if (!cancelled) setPrices(updated);
    }

    fetchAll();
    timer = setInterval(fetchAll, interval);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [JSON.stringify(tokens), interval]);

  return prices;
}