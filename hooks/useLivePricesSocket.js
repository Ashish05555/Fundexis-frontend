import { useEffect, useRef, useState } from "react";
import socket from "../utils/socketSetup";

export default function useLivePricesSocket(tokens = []) {
  const [prices, setPrices] = useState({});
  const tokensRef = useRef(tokens);

  useEffect(() => {
    tokensRef.current = tokens;

    tokens.forEach(token => {
      socket.emit("subscribeLivePrice", token);
    });

    const handler = tick => {
      // Always use string keys for object!
      const key = String(tick.instrument_token);
      setPrices(prev => ({
        ...prev,
        [key]: tick.live_price
      }));
    };

    socket.on("livePrice", handler);

    return () => {
      tokens.forEach(token => {
        socket.emit("unsubscribeLivePrice", token);
      });
      socket.off("livePrice", handler);
    };
  }, [JSON.stringify(tokens)]);

  return prices; // { [token]: price }
}