import React, { useState } from "react";
import ReactDOM from "react-dom";
import "../components/GTTOrderCard.css";

function formatNumber(num) {
  if (isNaN(num)) return "—";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function GTTOrderCard({
  order,
  livePrice,
  onModify,
  onCancelConfirmed,
}) {
  const [showModal, setShowModal] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  // Card fields
  const {
    trigger_type = "SINGLE",
    transaction_type = "BUY",
    symbol = "",
    status = "ACTIVE",
    trigger_price,
    trigger_price2,
    quantity = 0,
    tradingsymbol = "",
    placedAt,
    expiryAt,
  } = order;

  const triggerPriceDisplay =
    trigger_type === "OCO"
      ? `${formatNumber(trigger_price)} / ${formatNumber(trigger_price2)}`
      : formatNumber(trigger_price);

  let placedText = "";
  if (placedAt) {
    const d = new Date(placedAt._seconds ? placedAt._seconds * 1000 : placedAt);
    placedText = d.toLocaleString("en-IN", { hour12: true });
  }
  let expiryText = "";
  if (expiryAt) {
    const d = new Date(expiryAt._seconds ? expiryAt._seconds * 1000 : expiryAt);
    expiryText = d.toLocaleString("en-IN", { hour12: true });
  }

  // Move BUY badge a little left for alignment
  const badgeTypeShift = transaction_type === "BUY" ? { marginLeft: "-7px" } : undefined;

  // MODAL STATE
  const [cancelLoading, setCancelLoading] = useState(false);

  return (
    <>
      <div
        className="gtt-card"
        onClick={() => setShowModal(true)}
        tabIndex={0}
        role="button"
        style={{ cursor: "pointer" }}
      >
        {/* Top Row */}
        <div className="gtt-row space-between">
          <div className="gtt-row-left">
            <span className="badge badge-trigger-type">{trigger_type}</span>
            <span
              className={`badge badge-type ${transaction_type.toLowerCase()}`}
              style={badgeTypeShift}
            >
              {transaction_type}
            </span>
          </div>
          <div className="gtt-row-right">
            <span className={`badge badge-status-gtt status-${status.toLowerCase()}`}>{status.toUpperCase()}</span>
          </div>
        </div>

        {/* Row 2: Instrument and Trigger Price */}
        <div className="gtt-row space-between instrument-avg-row">
          <span className="gtt-instrument">{tradingsymbol || symbol}</span>
          <span className="gtt-trigger-price">{triggerPriceDisplay}</span>
        </div>

        {/* Row 3: Quantity, LTP */}
        <div className="gtt-row space-between bottom-row">
          <span className="gtt-qty-label">QTY {quantity}</span>
          <span className="gtt-ltp-label">
            LTP {livePrice !== undefined ? formatNumber(livePrice) : "—"}
          </span>
        </div>
        {/* Extra Row: Placed, Expiry */}
        <div className="gtt-row space-between gtt-extra-row">
          {placedText && <span className="gtt-placed-at">Placed: {placedText}</span>}
          {expiryText && <span className="gtt-expiry-at">Expiry: {expiryText}</span>}
        </div>
      </div>

      {/* Modal (portal) */}
      {showModal && !showConfirmCancel && ReactDOM.createPortal(
        <div className="gtt-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="gtt-modal" onClick={e => e.stopPropagation()}
            style={{
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start"
            }}
          >
            <div className="gtt-modal-content">
              <div className="gtt-modal-header" style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: "70px"
              }}>
                <span style={{ fontWeight: 800, fontSize: "1.25rem", color: "#1a237e" }}>
                  {tradingsymbol || symbol}
                </span>
              </div>
              <div className="gtt-modal-actions"
                style={{
                  marginTop: 48,
                  display: "flex",
                  gap: 18,
                  justifyContent: "center"
                }}
              >
                <button
                  className="gtt-modify-btn"
                  style={{
                    minWidth: 110,
                    minHeight: 48,
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 7,
                    padding: "12px 0",
                    fontSize: "1rem",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setShowModal(false);
                    if (onModify) onModify(order, { isModify: true });
                  }}
                >
                  Modify
                </button>
                <button
                  className="gtt-cancel-btn"
                  style={{
                    minWidth: 110,
                    minHeight: 48,
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 7,
                    padding: "12px 0",
                    fontSize: "1rem",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setShowModal(false);
                    setShowConfirmCancel(true);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel confirmation modal (portal) */}
      {showConfirmCancel && ReactDOM.createPortal(
        <div className="gtt-modal-overlay" onClick={() => setShowConfirmCancel(false)}>
          <div className="gtt-modal" onClick={e => e.stopPropagation()}
            style={{
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start"
            }}
          >
            <div className="gtt-modal-content">
              <div className="gtt-modal-header" style={{ fontWeight: 700, fontSize: "1.12rem", marginBottom: 28, color: "#1a237e" }}>
                Are you sure you want to cancel the order?
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 8, justifyContent: "center" }}>
                <button
                  className="gtt-confirm-ok-btn"
                  style={{
                    minWidth: 110,
                    minHeight: 48,
                    background: "#dc2626",
                    color: "#fff",
                    fontWeight: 700,
                    border: "none",
                    borderRadius: 7,
                    padding: "12px 0",
                    fontSize: "1rem",
                    cursor: cancelLoading ? "not-allowed" : "pointer",
                    opacity: cancelLoading ? 0.7 : 1,
                  }}
                  disabled={cancelLoading}
                  onClick={async () => {
                    setCancelLoading(true);
                    if (onCancelConfirmed) {
                      try {
                        await onCancelConfirmed(order);
                        setShowConfirmCancel(false); // close modal after cancel
                        setCancelLoading(false);
                      } catch (e) {
                        setCancelLoading(false);
                        alert("Failed to cancel order.");
                      }
                    } else {
                      setCancelLoading(false);
                    }
                  }}
                >
                  OK
                </button>
                <button
                  className="gtt-confirm-cancel-btn"
                  style={{
                    minWidth: 110,
                    minHeight: 48,
                    background: "#fff",
                    color: "#2563eb",
                    fontWeight: 700,
                    border: "1.5px solid #2563eb",
                    borderRadius: 7,
                    padding: "12px 0",
                    fontSize: "1rem",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setShowConfirmCancel(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}