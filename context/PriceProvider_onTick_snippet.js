import { evaluateOrdersOnTick } from "../services/executeTrade";

// Call this from your live price handler
async function onTick(tick) {
  // Tick shape will depend on your feed
  const tokenOrSymbol = tick.instrument_token || tick.token || tick.tradingsymbol;
  const ltp = Number(tick.last_price || tick.ltp || tick.price);
  const bid = Number(tick.best_bid || tick.bid || 0) || undefined;
  const ask = Number(tick.best_ask || tick.ask || 0) || undefined;

  // Get these from your app state/session
  const userId = auth.currentUser?.uid;
  const challengeId = selectedChallenge?.id || selectedChallenge?.challengeId;

  if (!userId || !challengeId || !tokenOrSymbol || !ltp) return;

  // It’s okay to call this on each tick; you can throttle per token if needed.
  await evaluateOrdersOnTick({ userId, challengeId, tokenOrSymbol, bid, ask, ltp }).catch(() => {});
}