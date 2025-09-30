import React from "react";
import "../components/ExecutedOrderCard.css";

const EXCHANGE_COLORS = {
  NSE: "#e53935",
  BSE: "#1976d2",
  NFO: "#888",
};

function formatNumber(num) {
  if (isNaN(num)) return "—";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_COLORS = {
  EXECUTED: "#27ae60",
  COMPLETE: "#27ae60",
  FILLED: "#27ae60",
  CANCELLED: "#e53935",
  REJECTED: "#e53935",
  FAILED: "#e53935",
};

export default function ExecutedOrderCard({ order }) {
  if (!order) {
    return (
      <div className="executed-card card-bordered">
        <div className="executed-row center">
          <span className="no-data">No order data</span>
        </div>
      </div>
    );
  }

  const {
    transaction_type = "BUY",
    quantity = 0,
    filled_quantity = 0,
    avg_price = 0,
    order_time = "",
    status = "EXECUTED",
    symbol = "",
    exchange = "NFO",
    product_type = "MIS",
    order_type = "MARKET",
    type,
    gtt,
  } = order;

  const upperStatus = String(status).toUpperCase();
  const statusColor = STATUS_COLORS[upperStatus] || "#27ae60";
  const exchangeColor = EXCHANGE_COLORS[String(exchange).toUpperCase()] || "#888";
  const statusBg =
    statusColor === "#e53935" ? "#fff6f6" : "#f2fff2";

  // GTT badge logic: show if type is "GTT" or gtt === true
  const isGTT = (type && String(type).toUpperCase() === "GTT") || gtt === true;

  return (
    <div className="executed-card card-bordered">
      {/* Top Row */}
      <div className="executed-row">
        <div className="executed-left-group">
          <span className={`badge badge-type ${String(transaction_type).toLowerCase()}`}>{transaction_type}</span>
          <span className="executed-qty">{filled_quantity}/{quantity}</span>
          <span className="executed-time">{order_time}</span>
        </div>
        <span
          className="badge badge-status"
          style={{
            color: statusColor,
            backgroundColor: statusBg,
            border: `1.8px solid ${statusColor}`,
          }}
        >
          {upperStatus}
        </span>
      </div>

      {/* Instrument and Avg (Row 2) */}
      <div className="executed-row">
        <div className="executed-left-group">
          <span className="executed-instrument">{symbol}</span>
        </div>
        <div className="avg-right">
          <span className="avg-label">Avg.</span>
          <span className="avg-value">{formatNumber(avg_price)}</span>
        </div>
      </div>

      {/* Exchange, GTT, Product, OrderType (Row 3) */}
      <div className="executed-row">
        <div className="executed-left-group" style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            className="executed-exchange"
            style={{
              background: "none",
              color: exchangeColor,
              border: "none",
              fontWeight: 700,
            }}
          >
            {exchange}
          </span>
          {isGTT && (
            <span
              className="badge badge-gtt"
              style={{
                background: "#1a237e",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 700,
                marginLeft: "2px",
                padding: "2px 8px",
                letterSpacing: 1.2,
              }}
            >
              GTT
            </span>
          )}
        </div>
        <div className="product-order-right">
          <span className={`product-type ${String(product_type).toLowerCase()}`}>{product_type}</span>
          <span className={`order-type ${String(order_type).toLowerCase()}`}>{order_type}</span>
        </div>
      </div>
    </div>
  );
}