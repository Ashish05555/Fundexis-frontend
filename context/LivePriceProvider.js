import React, { createContext, useContext } from "react";
import useRestLivePrices from "../hooks/useRestLivePrices";

// Add a default value to avoid undefined context
const LivePriceContext = createContext({ prices: {} });

export function LivePriceProvider({ tokens = [], interval = 1000, children }) {
  // Debug: show what tokens are being fetched and how often
  React.useEffect(() => {
    console.log("[LivePriceProvider] Fetching tokens:", tokens, "interval(ms):", interval);
  }, [JSON.stringify(tokens), interval]);

  const prices = useRestLivePrices(tokens, interval);

  return (
    <LivePriceContext.Provider value={{ prices }}>
      {children}
    </LivePriceContext.Provider>
  );
}

// Subscribe to a single token and get its live price (REST polling version)
export function useLivePrice(token) {
  const { prices } = useContext(LivePriceContext);
  // Return the price object for this token, or undefined if missing
  return prices && prices[String(token)];
}

// Subscribe to multiple tokens and get their prices as a map (REST polling version)
export function useLivePrices(tokens = []) {
  const { prices } = useContext(LivePriceContext);
  return Object.fromEntries(
    tokens.map(token => [String(token), prices && prices[String(token)]])
  );
}