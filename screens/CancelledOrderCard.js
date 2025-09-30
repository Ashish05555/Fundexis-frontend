import React from "react";
import "../components/CancelledOrderCard.css";

const EXCHANGE_COLORS = {
  NSE: "#e53935",
  BSE: "#1976d2",
  NFO: "#888",
};

const PRODUCT_COLORS = {
  MIS: { background: "#e3f2fd", color: "#1976d2" }, // blue
  NRML: { background: "#fffde7", color: "#fbc02d" }, // yellow
  CNC: { background: "#fffde7", color: "#fbc02d" },  // yellow (if used)
};
const ORDER_TYPE_COLORS = {
  LIMIT: { background: "#fffde7", color: "#fbc02d" },  // yellow
  MARKET: { background: "#fffde7", color: "#fbc02d" }, // yellow
};

function formatNumber(num) {
  if (isNaN(num)) return "—";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CancelledOrderCard({ order }) {
  if (!order) return null;

  const {
    transaction_type = "BUY",
    quantity = 0,
    filled_quantity = 0,
    avg_price = 0,
    status = "CANCELLED",
    symbol = "",
    exchange = "NSE",
    product_type = "MIS",      // Comes from actual order
    order_type = "LIMIT",      // Comes from actual order
    type,
    gtt,
  } = order;

  const exchangeColor = EXCHANGE_COLORS[String(exchange).toUpperCase()] || "#888";
  const isGTT = (type && String(type).toUpperCase() === "GTT") || gtt === true;

  // Get badge styles based on order data
  const productType = String(product_type).toUpperCase();
  const productBadgeStyle = PRODUCT_COLORS[productType] || PRODUCT_COLORS.MIS;
  const orderType = String(order_type).toUpperCase();
  const orderBadgeStyle = ORDER_TYPE_COLORS[orderType] || ORDER_TYPE_COLORS.LIMIT;

  return (
    <div className="cancelled-card card-bordered">
      {/* Top Row: Transaction Type, Quantity, Status */}
      <div className="cancelled-row">
        <div className="cancelled-left-group">
          <span className={`badge badge-type ${transaction_type.toLowerCase()}`}>
            {transaction_type}
          </span>
          <span className="cancelled-qty">{filled_quantity}/{quantity}</span>
        </div>
        <div className="cancelled-row-right">
          <span className="badge badge-status-cancelled">{String(status).toUpperCase()}</span>
        </div>
      </div>

      {/* Symbol and Avg Price Row */}
      <div className="cancelled-row">
        <div className="cancelled-left-group">
          <span className="cancelled-instrument">{symbol}</span>
        </div>
        <span>
          <span className="avg-label">Avg.</span>
          <span className="avg-value">{formatNumber(avg_price)}</span>
        </span>
      </div>

      {/* Exchange, GTT (if GTT), Product Type, Order Type */}
      <div className="cancelled-row">
        {/* Exchange + GTT */}
        <div className="cancelled-left-group" style={{ display: "flex", alignItems: "center" }}>
          <span
            className="cancelled-exchange"
            style={{
              color: exchangeColor,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            {exchange}
            {isGTT && (
              <span
                style={{
                  marginLeft: 8,
                  background: "#1a237e",
                  color: "#fff",
                  borderRadius: 4,
                  padding: "2px 8px",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                }}
              >
                GTT
              </span>
            )}
          </span>
        </div>
        {/* Product type (MIS/NRML/CNC), Order type (LIMIT/MARKET) */}
        <div className="product-order-right" style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span
            className={`badge badge-product-type ${productType.toLowerCase()}`}
            style={{
              background: productBadgeStyle.background,
              color: productBadgeStyle.color,
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 13,
              padding: "2px 10px",
              marginRight: 6,
            }}
          >
            {productType}
          </span>
          <span
            className={`badge badge-order-type ${orderType.toLowerCase()}`}
            style={{
              background: orderBadgeStyle.background,
              color: orderBadgeStyle.color,
              borderRadius: 4,
              fontWeight: 700,
              fontSize: 13,
              padding: "2px 10px",
            }}
          >
            {orderType}
          </span>
        </div>
      </div>
    </div>
  );
}