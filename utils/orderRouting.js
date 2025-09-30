// Normalize user's intent so "BUY limit above LTP" and "SELL limit below LTP"
// become STOP_LIMIT orders that wait for the trigger, then execute.
//
// Usage:
//   import { normalizeOrderBeforeSubmit } from "../utils/orderRouting";
//   const normalized = normalizeOrderBeforeSubmit(orderPayload, ltp, { tickSize: 0.1 });
//
// Notes:
// - If user explicitly provided a trigger/SL, we keep it and standardize the type to STOP_LIMIT.
// - For LIMIT orders:
//     BUY: if price > LTP  => STOP_LIMIT(trigger=price, price=price)
//     SELL: if price < LTP => STOP_LIMIT(trigger=price, price=price)
// - Everything is rounded to tick size (default 0.1)

export function normalizeOrderBeforeSubmit(order, ltp, opts = {}) {
  const tick = Number(opts.tickSize ?? 0.1);
  const roundToTick = (px) => {
    const n = Number(px);
    if (!Number.isFinite(n)) return n;
    // Round to nearest tick; e.g., 1370.04 -> 1370.0 for tick 0.1
    return Math.round(n / tick) * tick;
  };

  const side = String(order.side || order.transaction_type || "BUY").toUpperCase();
  const rawType = String(order.type || order.order_type || "LIMIT").toUpperCase();

  // Normalize price fields
  let price = order.price != null ? roundToTick(order.price) : undefined;
  let triggerPrice =
    order.triggerPrice != null
      ? roundToTick(order.triggerPrice)
      : order.trigger_price != null
      ? roundToTick(order.trigger_price)
      : undefined;

  // If user already intended SL/Stop-Limit, keep it (standardize the type name).
  const userWantsStop = rawType === "STOP_LIMIT" || rawType === "SL" || triggerPrice != null;
  if (userWantsStop) {
    return {
      ...order,
      type: "STOP_LIMIT",
      order_type: "STOP_LIMIT",
      price,
      triggerPrice: triggerPrice ?? price, // if UI gave only one price
      meta: { ...(order.meta || {}), normalized: true },
    };
  }

  // Auto-upgrade LIMIT to STOP_LIMIT only when it's "would execute later" intent:
  // BUY: price > LTP => wait for price to rise to trigger then place/fill limit
  // SELL: price < LTP => wait for price to fall to trigger then place/fill limit
  if (rawType === "LIMIT" && Number.isFinite(price) && Number.isFinite(ltp)) {
    const wantsWaitToReach =
      (side === "BUY" && price > ltp) || (side === "SELL" && price < ltp);

    if (wantsWaitToReach) {
      return {
        ...order,
        type: "STOP_LIMIT",
        order_type: "STOP_LIMIT",
        triggerPrice: price,
        price, // You can optionally add +tick for BUY or -tick for SELL if you want fill tolerance
        meta: { ...(order.meta || {}), autoUpgradedFrom: "LIMIT", normalized: true },
      };
    }
  }

  // Otherwise keep as-is (LIMIT below/above LTP or MARKET)
  return {
    ...order,
    type: rawType,
    order_type: rawType,
    price,
    meta: { ...(order.meta || {}), normalized: true },
  };
}