import React, { useState } from "react";
import useRestLivePrices from "../hooks/useRestLivePrices"; // Adjust the path as needed

const exampleTokens = [738561, 779521];

export default function LivePriceComponent() {
  const [tokens, setTokens] = useState(exampleTokens);
  const prices = useRestLivePrices(tokens, 1000); // Poll every 1 second
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
      <h2>Live Prices</h2>
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
      {/* Debug output */}
      <h3>Debug prices object:</h3>
      <pre>{JSON.stringify(prices, null, 2)}</pre>
      <ul>
        {tokens.map((token) => {
          const tick = prices[token];
          return (
            <li key={token}>
              Token {token}:{" "}
              {tick
                ? `₹${tick.price} ${tick.symbol ? `(${tick.symbol})` : ""}`
                : "Loading..."}
            </li>
          );
        })}
      </ul>
    </div>
  );
}