import React from 'react';

export const PRODUCT_TYPES = [
  { label: "Intraday (MIS)", value: "MIS" },
  { label: "Normal (NRML)", value: "NRML" }
  // CNC removed!
];

export default function ProductTypeDropdown({ value, onChange }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      {PRODUCT_TYPES.map(pt => (
        <option key={pt.value} value={pt.value}>{pt.label}</option>
      ))}
    </select>
  );
}