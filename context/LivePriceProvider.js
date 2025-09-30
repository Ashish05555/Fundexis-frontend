import React, { createContext, useContext } from "react";
import useRestLivePrices from "../hooks/useRestLivePrices";

// This context now provides REST-fetched prices only, not socket prices!
const LivePriceContext = createContext();

export function LivePriceProvider({ tokens = [], interval = 1000, children }) {
  // You may want to get tokens from props, or pass them as needed
  const prices = useRestLivePrices(tokens, interval);

  // No subscribe/unsubscribe: REST polling always fetches all tokens in array
  return (
    <LivePriceContext.Provider value={{ prices }}>
      {children}
    </LivePriceContext.Provider>
  );
}

// Subscribe to a single token and get its live price (REST polling version)
export function useLivePrice(token) {
  const { prices } = useContext(LivePriceContext);
  return prices[String(token)];
}

// Subscribe to multiple tokens and get their prices as a map (REST polling version)
export function useLivePrices(tokens = []) {
  const { prices } = useContext(LivePriceContext);
  return Object.fromEntries(tokens.map(token => [String(token), prices[String(token)]]));
}