import React from "react";
import useRestLivePrices from "../hooks/useRestLivePrices"; // update the path as needed

export default function InstrumentList({ instruments }) {
  const tokens = instruments.map(item => item.instrument_token);
  const prices = useRestLivePrices(tokens, 2000); // 2 second polling

  return (
    <ul>
      {instruments.map(item => (
        <li key={item.instrument_token}>
          {item.trading_symbol || item.symbol} - ₹
          {prices[item.instrument_token]?.price !== undefined && prices[item.instrument_token]?.price !== null
            ? prices[item.instrument_token].price
            : "--"}
        </li>
      ))}
    </ul>
  );
}