import { useEffect, useState } from "react";
import socket from "../utils/socketSetup";

// tokens: array of instrument tokens you want live prices for
export default function useLivePrices(tokens = [738561]) {
  const [prices, setPrices] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    // Subscribe to tokens (emit all at once for efficiency)
    if (tokens && tokens.length) {
      socket.emit("subscribe", tokens); // emits array to backend
    }

    // Handler for array of ticks
    const handler = (ticks) => {
      // ticks is expected to be an array of tick objects
      if (Array.isArray(ticks) && isMounted) {
        const updated = {};
        ticks.forEach(tick => {
          if (tick && tick.instrument_token) {
            updated[tick.instrument_token] = {
              price: tick.last_price,
              symbol: tick.tradingsymbol || "",
              timestamp: tick.timestamp || null,
            };
          }
        });
        setPrices(prev => ({ ...prev, ...updated }));
        setError(null);
      }
    };

    // Listen for price updates
    socket.on("price_update", handler);

    // Listen for socket errors
    socket.on("connect_error", (err) => {
      setError(err && err.message ? err.message : "Socket connection error");
    });

    // Cleanup
    return () => {
      isMounted = false;
      socket.emit("unsubscribe", tokens);
      socket.off("price_update", handler);
      socket.off("connect_error");
    };
  }, [JSON.stringify(tokens)]);

  return { prices, error };
}