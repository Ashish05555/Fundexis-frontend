import React, { useState, useEffect } from 'react';
import ProductTypeDropdown from './ProductTypeDropdown';
import OrderTypeDropdown from './OrderTypeDropdown';
import useLivePrices from '../hooks/useLivePrices';

export default function OrderForm({ instrument, onSubmit }) {
  const [productType, setProductType] = useState("MIS");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(""); // User input for limit orders
  const [priceManuallySet, setPriceManuallySet] = useState(false); // Track manual input
  const [triggerPrice, setTriggerPrice] = useState(""); // For SL/SLM
  const [slLimitPrice, setSlLimitPrice] = useState(""); // For SL only
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAMO, setIsAMO] = useState(false);

  // Live price logic
  const token = instrument ? Number(instrument.instrument_token) : null;
  const prices = useLivePrices(token ? [token] : []);
  const livePrice = token ? prices[token] : undefined;

  // Auto-update price field for MARKET order (and when not manually set)
  useEffect(() => {
    if (orderType === "MARKET" && livePrice !== undefined) {
      setPrice(livePrice);
      setPriceManuallySet(false);
    }
    if (
      (orderType === "LIMIT" || orderType === "BO" || orderType === "CO" || orderType === "ICEBERG") &&
      !priceManuallySet &&
      livePrice !== undefined
    ) {
      setPrice(livePrice);
    }
  }, [livePrice, orderType]); // React to price and order type changes

  // Detect if current order type is stop-loss
  const isSL = orderType === "SL";
  const isSLM = orderType === "SLM";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Build orderData with all fields
    const orderData = {
      instrument_token: token,
      tradingsymbol: instrument?.tradingsymbol,
      productType,
      orderType,
      quantity,
      price,
      amo: isAMO ? { scheduledFor: null } : undefined,
    };

    // Add SL/trigger fields if needed
    if (isSL || isSLM) {
      orderData.trigger_price = Number(triggerPrice) || undefined;
      orderData.slActive = true;
    }
    if (isSL) {
      orderData.stop_limit_price = Number(slLimitPrice) || Number(price) || undefined;
    }

    try {
      await onSubmit(orderData);
      setQuantity(1);
      setPrice("");
      setPriceManuallySet(false);
      setTriggerPrice("");
      setSlLimitPrice("");
      setError("");
    } catch (err) {
      setError(err?.message || "Order placement failed");
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <strong>{instrument?.tradingsymbol}</strong>
        <span style={{ marginLeft: 12, color: "#666" }}>{instrument?.name}</span>
        <div style={{ marginTop: 4, fontSize: 18 }}>
          <span style={{ float: "right", color: "blue" }}>
            {livePrice !== undefined ? livePrice : "Loading..."}
          </span>
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <OrderTypeDropdown value={orderType} onChange={setOrderType} />
        <ProductTypeDropdown value={productType} onChange={setProductType} />
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          placeholder="Quantity"
          required
        />
        {(orderType === "LIMIT" || orderType === "BO" || orderType === "CO" || orderType === "ICEBERG" || isSL) && (
          <input
            type="number"
            value={price}
            onChange={e => {
              setPrice(e.target.value);
              setPriceManuallySet(true);
            }}
            placeholder="Price"
            required={orderType !== "MARKET"}
            style={{ background: "#f7f7f7" }}
          />
        )}
        {orderType === "MARKET" && (
          <input
            type="number"
            value={price}
            readOnly
            style={{ background: "#eee" }}
            placeholder="Live Price"
            tabIndex={-1}
          />
        )}
        {/* SL/Trigger Section */}
        {(isSL || isSLM) && (
          <input
            type="number"
            value={triggerPrice}
            onChange={e => setTriggerPrice(e.target.value)}
            placeholder="Trigger Price"
            required
            style={{ background: "#f7f7f7", marginLeft: 8 }}
          />
        )}
        {isSL && (
          <input
            type="number"
            value={slLimitPrice}
            onChange={e => setSlLimitPrice(e.target.value)}
            placeholder="SL Limit Price"
            required
            style={{ background: "#f7f7f7", marginLeft: 8 }}
          />
        )}
        {/* Example AMO toggle */}
        <label style={{ marginLeft: 8 }}>
          <input
            type="checkbox"
            checked={isAMO}
            onChange={e => setIsAMO(e.target.checked)}
          /> AMO (After Market Order)
        </label>
        <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>
          {loading ? "Placing..." : "Place Order"}
        </button>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      </form>
    </div>
  );
}