import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import ActiveTradeCard from "./ActiveTradeCard";
import "./ActiveTradeBar.css";
import { useActiveTrades } from "../hooks/useActiveTrades"; // <-- Make sure this is the correct path
import { useChallenge } from "../context/ChallengeContext";
import { useLivePrices } from "../context/LivePriceProvider"; // <-- Import your live price hook
import instrumentsData from "../data/instruments.json"; // If you pass it as prop, you can remove this line

// ---------- small helpers for Trigger/Limit detection (no global CSS) ----------
function upper(v, fb = "") {
  return String(v ?? fb).toUpperCase();
}
function isPosNum(n) {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
function toNum(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : undefined;
    }
  }
  return undefined;
}
function formatCurrency(num) {
  if (!isPosNum(num)) return "—";
  return "₹" + Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
function getKind(order) {
  const ot = upper(order?.order_type || "");
  const pt = upper(order?.price_type || "");
  const txt = `${ot} ${pt}`;
  const isSLM = /\bSLM\b|\bSL-M\b/.test(txt);
  const isSLL =
    /\bSL[-_ ]?L(IMIT)?\b/.test(txt) ||
    (/\bSL\b/.test(txt) && !isSLM);
  return { isSLM, isSLL };
}
const TRIGGER_KEYS = [
  "trigger_price",
  "triggerPrice",
  "sl_trigger_price",
  "slTriggerPrice",
  "sl_trigger",
  "stop_price",
  "stopPrice",
  "stoploss_trigger_price",
  "stoploss_trigger",
  // also try generic "trigger"
  "trigger",
];
const LIMIT_KEYS = [
  "stop_limit_price",
  "stoploss_limit",
  "stopLimitPrice",
  "limit_price",
  "limitPrice",
  "order_price",
  "lmtPrice",
];
function pickByKeys(obj, keys) {
  for (const k of keys) {
    const n = toNum(obj?.[k]);
    if (isPosNum(n)) return n;
  }
  return undefined;
}
function pickLimit(trade) {
  const { isSLM, isSLL } = getKind(trade);
  const byKeys = pickByKeys(trade, LIMIT_KEYS);
  if (isSLM) return isPosNum(byKeys) ? byKeys : undefined;
  if (isSLL) {
    if (isPosNum(byKeys)) return byKeys;
    const p = toNum(trade.price);
    return isPosNum(p) ? p : undefined;
  }
  // Plain LIMIT: many payloads put the limit in price
  return isPosNum(byKeys) ? byKeys : toNum(trade.price);
}
function pickTrigger(trade) {
  const { isSLM /* isSLL */ } = getKind(trade);
  const direct = pickByKeys(trade, TRIGGER_KEYS);
  if (isPosNum(direct)) return direct;
  if (isSLM) {
    const p = toNum(trade.price);
    if (isPosNum(p)) return p;
  }
  // SL-L and others: don’t infer trigger from price
  return undefined;
}

export default function ActiveTradeBar({
  instrumentsMeta = instrumentsData,
  onTradeAction,
  marketOpen = true,
}) {
  const { selectedChallenge } = useChallenge();
  const trades = useActiveTrades(selectedChallenge);

  // Collect all tokens needed for live prices (unique)
  const tokens = useMemo(() => {
    const set = new Set();
    for (const trade of trades) {
      const token =
        trade.instrument_token ||
        trade.token ||
        instrumentsMeta.find(
          (m) =>
            m.symbol === trade.symbol ||
            m.tradingsymbol === trade.tradingsymbol
        )?.instrument_token;
      if (token) set.add(String(token));
    }
    return Array.from(set);
  }, [trades, instrumentsMeta]);

  // Get live prices for these tokens
  const ltpByToken = useLivePrices(tokens);

  // Calculate P&L for each trade and pass ltp
  const tradesWithPnl = useMemo(() => {
    return trades.map((trade) => {
      const token =
        trade.instrument_token ||
        trade.token ||
        instrumentsMeta.find(
          (m) =>
            m.symbol === trade.symbol ||
            m.tradingsymbol === trade.tradingsymbol
        )?.instrument_token;
      const ltp = ltpByToken[token];
      const qty = trade.quantity || 0;
      const avg =
        typeof trade.price === "number"
          ? trade.price
          : typeof trade.avg_price === "number"
          ? trade.avg_price
          : 0;
      const side = (trade.side || trade.transaction_type || "BUY").toUpperCase();
      // Basic P&L logic: (LTP - ENTRY) * QTY for BUY, (ENTRY - LTP) * QTY for SELL
      let pnl = 0;
      if (typeof ltp === "number" && typeof avg === "number" && qty) {
        pnl =
          side === "BUY"
            ? (ltp - avg) * qty
            : (avg - ltp) * qty;
      }
      return { ...trade, ltp, pnl };
    });
  }, [trades, ltpByToken, instrumentsMeta]);

  // Popup logic
  const [popupTrade, setPopupTrade] = useState(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function handleCardClick(trade) {
    setPopupTrade(trade);
    setShowExitConfirm(false);
    document.body.style.overflow = "hidden";
  }

  function handleAdd() {
    if (onTradeAction && popupTrade) {
      // No input fields anymore; pass the trade as-is
      onTradeAction("add", { ...popupTrade });
    }
    setPopupTrade(null);
    document.body.style.overflow = "";
  }

  function handleExit() {
    if (!marketOpen) return;
    setShowExitConfirm(true);
  }

  function handleConfirmExit() {
    if (onTradeAction && popupTrade) {
      // No input fields anymore; pass the trade as-is
      onTradeAction("exit", { ...popupTrade });
    }
    setShowExitConfirm(false);
    setPopupTrade(null);
    document.body.style.overflow = "";
  }

  function handleCancelExit() {
    setShowExitConfirm(false);
  }

  function handleClosePopup() {
    setPopupTrade(null);
    setShowExitConfirm(false);
    document.body.style.overflow = "";
  }

  // Optional: Scroll to top of active trades list when trades change
  useEffect(() => {
    const el = document.querySelector(".active-trades-list");
    if (el) el.scrollTop = 0;
  }, [tradesWithPnl.length]);

  return (
    <div className="active-trades-list">
      {tradesWithPnl.length === 0 ? (
        <div className="empty-trades">No active trades</div>
      ) : (
        tradesWithPnl.map((trade) => (
          <ActiveTradeCard
            key={trade.id}
            trade={trade}
            instrumentsMeta={instrumentsMeta}
            onCardClick={handleCardClick}
          />
        ))
      )}

      {popupTrade &&
        ReactDOM.createPortal(
          <div>
            <div className="trade-popup-overlay" onClick={handleClosePopup}></div>
            <div className="trade-popup">
              <div
                className="trade-popup-content"
                onClick={(e) => e.stopPropagation()}
              >
                {!showExitConfirm ? (
                  <>
                    {/* Header: LEFT symbol, RIGHT LTP + Trigger + Limit */}
                    <div
                      className="trade-popup-header"
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
                    >
                      <span>{popupTrade.tradingsymbol || popupTrade.symbol}</span>
                      <div style={{ textAlign: "right", lineHeight: 1.45 }}>
                        {/* Keep your existing class for LTP to preserve styling */}
                        <div className="trade-popup-ltp">
                          LTP: {isPosNum(toNum(popupTrade.ltp ?? popupTrade.price))
                            ? formatCurrency(toNum(popupTrade.ltp ?? popupTrade.price))
                            : "—"}
                        </div>

                        {/* Always show Trigger and Limit lines (Trigger may be "—" if missing) */}
                        {(() => {
                          const trig = pickTrigger(popupTrade);
                          const lim = pickLimit(popupTrade);
                          return (
                            <>
                              <div style={{ fontWeight: 700, color: "#374151", marginTop: 6 }}>
                                Trigger:{" "}
                                <span style={{ fontWeight: 800, color: "#111827" }}>
                                  {isPosNum(trig) ? formatCurrency(trig) : "—"}
                                </span>
                              </div>
                              <div style={{ fontWeight: 700, color: "#374151", marginTop: 6 }}>
                                Limit:{" "}
                                <span style={{ fontWeight: 800, color: "#111827" }}>
                                  {isPosNum(lim) ? formatCurrency(lim) : "—"}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Inputs removed, as requested */}

                    {/* Buttons: unchanged classes and structure to preserve sizes */}
                    <div className="trade-popup-actions">
                      <button className="popup-add-btn" onClick={handleAdd}>
                        Add
                      </button>
                      <button
                        className={`popup-exit-btn${
                          !marketOpen ? " popup-exit-btn-disabled" : ""
                        }`}
                        onClick={handleExit}
                        disabled={!marketOpen}
                      >
                        Exit
                      </button>
                    </div>
                    {!marketOpen && (
                      <div className="popup-market-closed-msg">
                        <span>Market closed. Exit disabled.</span>
                      </div>
                    )}
                    <button className="popup-close-btn" onClick={handleClosePopup}>
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <div className="trade-popup-header">
                      <span>Exit Position</span>
                    </div>
                    <div className="trade-popup-exit-confirm">
                      <span>Are you sure you want to exit this position?</span>
                    </div>
                    <div className="trade-popup-actions">
                      <button className="popup-add-btn" onClick={handleConfirmExit}>
                        OK
                      </button>
                      <button className="popup-exit-btn" onClick={handleCancelExit}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}