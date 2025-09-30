import React from 'react';

export const ORDER_TYPES = [
  { label: "Market", value: "MARKET" },
  { label: "Limit", value: "LIMIT" },
  { label: "Stop Loss", value: "SL" },         // Stop Loss LIMIT
  { label: "Stop Loss Market", value: "SLM" }, // Stop Loss MARKET
  { label: "Iceberg", value: "ICEBERG" },
  { label: "After Market Order (AMO)", value: "AMO" },
  { label: "Bracket Order (BO)", value: "BO" },
  { label: "Cover Order (CO)", value: "CO" },
  { label: "GTT (Good Till Triggered)", value: "GTT" },
  { label: "OCO (One Cancels Other)", value: "OCO" }
];

export default function OrderTypeDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {ORDER_TYPES.map(ot => (
        <option key={ot.value} value={ot.value}>{ot.label}</option>
      ))}
    </select>
  );
}