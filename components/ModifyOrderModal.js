import React, { useState, useMemo } from "react";
import CustomDropdown from "./CustomDropdown";

/**
 * Zerodha-style Modify Order Modal
 * - Instrument name always left-aligned.
 * - SL and Trigger price (and SL limit if STOP_LIMIT) are shown on the right only if the order has SL/trigger.
 * - For orders without SL, instrument name remains left-aligned and nothing is shown on the right.
 * - Other form and validation logic unchanged.
 * 
 * Props:
 *   - order: order object with current details
 *   - instrumentMeta: {
 *       minQty: number,
 *       maxQty: number,
 *       priceStep: number,
 *       lowerPriceBand: number,
 *       upperPriceBand: number
 *     }
 *   - onClose: function to close modal
 *   - onOrderModified: function(order) called when modification succeeds
 */
export default function ModifyOrderModal({ order, instrumentMeta, onClose, onOrderModified }) {
  if (
    !instrumentMeta ||
    typeof instrumentMeta.minQty !== "number" ||
    typeof instrumentMeta.maxQty !== "number" ||
    typeof instrumentMeta.priceStep !== "number" ||
    typeof instrumentMeta.lowerPriceBand !== "number" ||
    typeof instrumentMeta.upperPriceBand !== "number" ||
    !order
  ) {
    return (
      <div style={{
        padding: '2rem',
        background: '#fff',
        borderRadius: '18px',
        width: 350,
        margin: '2rem auto',
        color: '#e53935',
        textAlign: 'center',
        boxShadow: '0 4px 32px rgba(44,56,120,0.13)'
      }}>
        <h2 style={{color:"#1326b5"}}>Error</h2>
        Missing order or instrument meta data. Please try again.<br/>
        <button
          style={{marginTop:"1.2rem", padding:"0.6rem 1.5rem", borderRadius:"7px", background:"#1326b5", color:"#fff", fontWeight:"bold", border:"none", fontSize:"1rem"}}
          onClick={typeof onClose === "function" ? onClose : () => window.location.reload()}
        >
          Close
        </button>
        <div style={{marginTop:"0.6rem", fontSize:"0.93rem", color:"#444"}}>If this persists, check your backend API and modal invocation.</div>
      </div>
    );
  }

  const [price, setPrice] = useState(order.price || "");
  const [quantity, setQuantity] = useState(order.quantity || "");
  const [orderType, setOrderType] = useState(order.order_type || "MARKET");
  const [variety, setVariety] = useState(order.variety || "REGULAR");
  const [triggerPrice, setTriggerPrice] = useState(order.trigger_price || "");
  const [stoploss, setStoploss] = useState(order.stoploss || "");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function toCurrency(val) {
    if (!val || isNaN(val)) return "—";
    return "₹" + Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // Accept various possible field names and treat non-empty as present
  const slActive =
    !!(
      order.slActive ||
      order.trigger_price !== undefined ||
      order.triggerPrice !== undefined ||
      order.stoploss_limit !== undefined ||
      order.stop_limit !== undefined
    );
  const trigger =
    order.trigger_price ??
    order.triggerPrice ??
    order.sl_trigger ??
    order.stop_trigger ??
    order.stoploss_trigger ??
    order.slTriggerPrice ??
    order.trigger ??
    order.stopPrice ??
    "";
  const stoplimit =
    order.stoploss_limit ??
    order.stop_limit ??
    order.stopLimit ??
    order.limit_price ??
    order.limitPrice ??
    order.order_price ??
    order.price ??
    "";

  function isQtyValid(qty) {
    if (!qty || isNaN(qty)) return false;
    qty = Number(qty);
    return qty >= instrumentMeta.minQty && qty <= instrumentMeta.maxQty && Number.isInteger(qty);
  }
  function isPriceValid(price) {
    if (!price || isNaN(price)) return false;
    price = Number(price);
    if (price < instrumentMeta.lowerPriceBand || price > instrumentMeta.upperPriceBand) return false;
    const step = instrumentMeta.priceStep;
    return Math.abs((price - instrumentMeta.lowerPriceBand) % step) < 0.0000001;
  }

  const qtyError = useMemo(() => {
    if (quantity === "") return "Enter quantity";
    if (!isQtyValid(quantity)) return `Quantity must be ${instrumentMeta.minQty}-${instrumentMeta.maxQty}, whole numbers only.`;
    return "";
  }, [quantity, instrumentMeta]);
  const priceError = useMemo(() => {
    if (orderType === "MARKET") return ""; // Not required
    if (price === "") return "Enter limit price";
    if (!isPriceValid(price)) return `Limit price must be ${instrumentMeta.lowerPriceBand}-${instrumentMeta.upperPriceBand} in steps of ${instrumentMeta.priceStep}`;
    return "";
  }, [price, orderType, instrumentMeta]);

  const isFormValid = orderType === "MARKET"
    ? qtyError === ""
    : qtyError === "" && priceError === "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `/orders/modify/${order.id || order.orderId || order._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            challengeId: order.challengeId,
            demoAccountType: order.demoAccountType,
            newPrice: orderType === "MARKET" ? null : price,
            newQuantity: quantity,
            newOrderType: orderType,
            newVariety: variety,
            newTriggerPrice: triggerPrice,
            newStoploss: stoploss,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.message === "Order modified") {
        onOrderModified({
          ...order,
          price: orderType === "MARKET" ? null : price,
          quantity,
          order_type: orderType,
          variety,
          trigger_price: triggerPrice,
          stoploss,
        });
        onClose();
      } else {
        setSubmitError(data.error || "Could not modify order.");
      }
    } catch (err) {
      setSubmitError("Could not modify order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Modal Header: Instrument left, SL/Trigger right ---
  const hasTrigger = slActive && (trigger !== "" && !isNaN(Number(trigger)));
  const hasStoplimit = slActive && (stoplimit !== "" && !isNaN(Number(stoplimit))) && orderType !== "MARKET";

  return (
    <div className="modal-ui-backdrop">
      <div className="modal-ui-box">
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: "1.1rem"
        }}>
          <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#1326b5", flex: 1, textAlign: "left" }}>
            {order.tradingsymbol || order.symbol || order.instrument || "INSTRUMENT"}
          </span>
          {(hasStoplimit || hasTrigger) && (
            <div style={{ minWidth: 90, textAlign: "right" }}>
              {hasStoplimit && (
                <div style={{ fontSize: "1.05rem", color: "#222", fontWeight: 600 }}>
                  SL: <span style={{ fontWeight: 700 }}>{toCurrency(stoplimit)}</span>
                </div>
              )}
              {hasTrigger && (
                <div style={{ fontSize: "1.05rem", color: "#444", fontWeight: 600 }}>
                  Trigger: <span style={{ fontWeight: 700 }}>{toCurrency(trigger)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="modal-ui-form">
          <div className="modal-ui-field">
            <label>Price</label>
            <input
              type="number"
              step={instrumentMeta.priceStep}
              className="modal-ui-input"
              value={orderType === "MARKET" ? "" : price}
              onChange={e => setPrice(e.target.value)}
              disabled={orderType === "MARKET"}
              placeholder={orderType === "MARKET" ? "Not required for Market orders" : ""}
            />
            {orderType !== "MARKET" && priceError && (
              <div className="modal-ui-error">{priceError}</div>
            )}
          </div>
          <div className="modal-ui-field">
            <label>Quantity</label>
            <input
              type="number"
              min={instrumentMeta.minQty}
              max={instrumentMeta.maxQty}
              className="modal-ui-input"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
            />
            {qtyError && <div className="modal-ui-error">{qtyError}</div>}
          </div>
          <div className="modal-ui-field">
            <label>Order Type</label>
            <CustomDropdown
              options={["MARKET", "LIMIT"]}
              value={orderType}
              onChange={setOrderType}
              placeholder="Select type"
            />
          </div>
          <div className="modal-ui-field">
            <label>Variety</label>
            <CustomDropdown
              options={["REGULAR", "AMO"]}
              value={variety}
              onChange={setVariety}
              placeholder="Select variety"
            />
          </div>
          <div className="modal-ui-field">
            <label>Trigger Price (optional)</label>
            <input
              type="number"
              step={instrumentMeta.priceStep}
              className="modal-ui-input"
              value={triggerPrice}
              onChange={e => setTriggerPrice(e.target.value)}
            />
          </div>
          <div className="modal-ui-field">
            <label>Stoploss (optional)</label>
            <input
              type="number"
              step={instrumentMeta.priceStep}
              className="modal-ui-input"
              value={stoploss}
              onChange={e => setStoploss(e.target.value)}
            />
          </div>
          {submitError && <div className="modal-ui-error">{submitError}</div>}
          <div className="modal-ui-buttons">
            <button type="submit" className="modal-ui-btn-primary" disabled={loading || !isFormValid}>
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button type="button" className="modal-ui-btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .modal-ui-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(44, 56, 120, 0.16);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .modal-ui-box {
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 32px rgba(44, 56, 120, 0.13);
          width: 380px;
          max-width: 95vw;
          padding: 2.2rem 2rem 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .modal-ui-header {
          color: #1326b5;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1.2rem;
          letter-spacing: 0.2px;
          font-family: 'Montserrat', 'Inter', Arial, sans-serif;
        }
        .modal-ui-form {
          width: 100%;
        }
        .modal-ui-field {
          margin-bottom: 1.05rem;
          width: 100%;
        }
        .modal-ui-field label {
          display: block;
          font-size: 1.05rem;
          font-weight: 600;
          color: #26328c;
          margin-bottom: 0.35rem;
          font-family: 'Inter', Arial, sans-serif;
        }
        .modal-ui-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.65rem 0.8rem;
          font-size: 1rem;
          border: 1.5px solid #d0d6f7;
          border-radius: 9px;
          outline: none;
          transition: border-color 0.2s;
          background: #f7f9fd;
          font-family: 'Inter', Arial, sans-serif;
        }
        .modal-ui-input:focus {
          border-color: #1326b5;
        }
        .modal-ui-field .dropdown-ui-root {
          width: 100%;
        }
        .modal-ui-error {
          color: #e53935;
          margin-top: 0.3rem;
          font-size: 0.98rem;
          text-align: left;
        }
        .modal-ui-buttons {
          display: flex;
          gap: 0.8rem;
          justify-content: space-between;
          width: 100%;
          margin-top: 1.1rem;
        }
        .modal-ui-btn-primary {
          background: #1326b5;
          color: #fff;
          font-weight: 700;
          border: none;
          padding: 0.7rem 0;
          width: 48%;
          border-radius: 8px;
          font-size: 1.07rem;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(44,56,120,0.13);
          transition: background 0.18s;
        }
        .modal-ui-btn-primary:hover:not(:disabled) {
          background: #0e1b7d;
        }
        .modal-ui-btn-primary:disabled {
          background: #a7b1ec;
          cursor: not-allowed;
        }
        .modal-ui-btn-secondary {
          background: #f5f7fa;
          color: #1326b5;
          font-weight: 600;
          border: none;
          padding: 0.7rem 0;
          width: 48%;
          border-radius: 8px;
          font-size: 1.07rem;
          cursor: pointer;
          transition: background 0.13s;
        }
        .modal-ui-btn-secondary:hover {
          background: #e8eaf6;
        }
        @media (max-width: 500px) {
          .modal-ui-box {
            padding: 1.4rem 0.7rem 1rem 0.7rem;
            width: 98vw;
          }
          .modal-ui-header {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}