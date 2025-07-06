import { useEffect, useRef, useState } from "react";

export default function useLivePrices() {
  const [prices, setPrices] = useState({});
  const ws = useRef(null);

  useEffect(() => {
   ws.current = new WebSocket("ws://192.168.29.246:3000"); // Change this!
    ws.current.onopen = () => console.log("Connected to price server");
    ws.current.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "ticks") {
        const updated = {};
        msg.data.forEach(tick => {
          updated[tick.instrument_token] = tick.last_price;
        });
        setPrices(prev => ({ ...prev, ...updated }));
      }
    };
    ws.current.onerror = (e) => console.log("WebSocket error", e.message);
    ws.current.onclose = () => console.log("WebSocket closed");

    return () => ws.current && ws.current.close();
  }, []);

  return prices;
}