import React, { useState } from "react";
import useRestLivePrices from "../hooks/useRestLivePrices"; // Adjust the path as needed

// Example tokens (replace with your actual tokens or make dynamic as needed)
const exampleTokens = [738561, 779521];

export default function LivePricesTable() {
  const [tokens, setTokens] = useState(exampleTokens);
  const prices = useRestLivePrices(tokens, 1000); // Poll every 1 second

  const priceArray = Object.values(prices);

  const [input, setInput] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    const newTokens = input
      .split(",")
      .map((t) => Number(t.trim()))
      .filter((t) => !isNaN(t) && t > 0);
    setTokens(newTokens.length ? newTokens : exampleTokens);
    setInput("");
  };

  return (
    <div style={{ padding: "1rem", border: "1px solid #ddd" }}>
      <h2>Live Prices Table</h2>
      <form onSubmit={handleSubscribe}>
        <label>
          Instrument Tokens (comma-separated):{" "}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 738561,779521"
            style={{ width: "200px" }}
          />
        </label>
        <button type="submit" style={{ marginLeft: "1em" }}>Subscribe</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Token</th>
            <th>Price</th>
            <th>Bid</th>
            <th>Ask</th>
            <th>Volume</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {priceArray.map(tick => (
            <tr key={tick.instrument_token}>
              <td>{tick.symbol}</td>
              <td>{tick.instrument_token}</td>
              <td>{tick.price}</td>
              <td>{tick.bid}</td>
              <td>{tick.ask}</td>
              <td>{tick.volume}</td>
              <td>{tick.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Debug prices object:</h3>
      <pre>{JSON.stringify(prices, null, 2)}</pre>
    </div>
  );
}