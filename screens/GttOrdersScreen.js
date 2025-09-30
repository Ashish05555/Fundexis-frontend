import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";
import { db, auth } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

const GTT_API_ENDPOINT = "/orders/gtt/place";

const TICK = 0.05;
const format2 = (n) => {
  const val = Number.isFinite(n) ? n : Number(n || 0);
  return val.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const onlyDigits = (s) => (s ?? "").toString().replace(/\D+/g, "");
const toInt = (s, fallback = 0) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : fallback;
};
const floorToMultiple = (value, step) => Math.max(step, Math.floor(value / step) * step);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function safeAlert(title, message) {
  try {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  } catch {
    console.warn("Alert:", title, message);
  }
}

// Remove all keys with value === undefined (Firestore prohibits undefined)
function withDefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function detectIsEquity(instrument) {
  const seg = (instrument?.segment || instrument?.type || instrument?.instrument_type || "")
    .toString()
    .toUpperCase();
  const ex = (instrument?.exchange || "").toString().toUpperCase();
  const sym = (instrument?.tradingsymbol || instrument?.symbol || "").toString().toUpperCase();
  const looksFut = seg.includes("FUT") || sym.endsWith("FUT") || sym.includes(" FUT ");
  const looksOpt =
    seg.includes("OPT") ||
    sym.endsWith("CE") ||
    sym.endsWith("PE") ||
    sym.includes(" CE") ||
    sym.includes(" PE");
  const isNfo = ex === "NFO";
  if (looksFut || looksOpt || isNfo) return false;
  if (seg.includes("EQ") || seg === "EQUITY") return true;
  if (ex === "NSE" || ex === "BSE") return true;
  return true;
}

function deriveLotSize(instrument, isEquity) {
  if (isEquity) return 1;
  const candidates = [
    instrument?.lot_size,
    instrument?.lotSize,
    instrument?.marketlot,
    instrument?.qty_step,
    instrument?.trading_unit,
  ];
  for (const c of candidates) {
    const n = parseInt(c, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 1;
}

function deriveMaxPerOrderQty(instrument, lotSize, isEquity) {
  const fields = [
    instrument?.freeze_qty,
    instrument?.freezeQty,
    instrument?.max_order_qty,
    instrument?.maxOrderQty,
    instrument?.max_qty,
    instrument?.maxQty,
  ];
  for (const f of fields) {
    const n = parseInt(f, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (isEquity) return 100000;
  return lotSize * 100;
}

function defaultProduct(isEquity) {
  return isEquity ? "CNC" : "NRML";
}

function estimateRequiredFunds({ instrument, side, quantity, limit_price, trigger_price }, ltp) {
  const seg = (instrument?.segment || instrument?.type || instrument?.instrument_type || "").toString().toUpperCase();
  const sym = (instrument?.tradingsymbol || instrument?.symbol || "").toString().toUpperCase();
  const isFut = seg.includes("FUT");
  const isOpt = seg.includes("OPT") || sym.endsWith("CE") || sym.endsWith("PE");
  const refPrice = Number(limit_price) || Number(trigger_price) || Number(ltp) || 0;
  if (!isFut && !isOpt) {
    if (side === "BUY") return quantity * refPrice;
    return 0;
  }
  if (isFut) return quantity * refPrice * 0.20;
  if (side === "BUY") return quantity * refPrice;
  return quantity * refPrice * 0.40;
}

export default function GttOrdersScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { selectedChallenge } = useChallenge();

  const instrument = route?.params?.instrument || {};
  const availableCash = route?.params?.availableCash;

  const ltp = useMemo(() => {
    const raw = route?.params?.last_price ?? instrument?.last_price ?? instrument?.close;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  }, [route?.params?.last_price, instrument?.last_price, instrument?.close]);

  useLayoutEffect(() => {
    navigation?.setOptions?.({ headerShown: false });
  }, [navigation]);

  const demoAccountType = route?.params?.demoAccountType || "default";
  const challengeId = route?.params?.challengeId || selectedChallenge?.id || selectedChallenge?._id;

  const [side, setSide] = useState("BUY");
  const [triggerType, setTriggerType] = useState("single"); // 'single' | 'oco'
  const [qty, setQty] = useState("1");

  // Single
  const [triggerPrice, setTriggerPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");

  // OCO
  const [targetTrigger, setTargetTrigger] = useState("");
  const [targetLimit, setTargetLimit] = useState("");
  const [stopTrigger, setStopTrigger] = useState("");
  const [stopLimit, setStopLimit] = useState("");

  const [showPlacedModal, setShowPlacedModal] = useState(false);
  const [placing, setPlacing] = useState(false);
  const createdRef = useRef(null);

  const isEquity = useMemo(() => detectIsEquity(instrument), [instrument]);
  const lotSize = useMemo(() => deriveLotSize(instrument, isEquity), [instrument, isEquity]);
  const maxPerOrderQty = useMemo(() => deriveMaxPerOrderQty(instrument, lotSize, isEquity), [instrument, lotSize, isEquity]);

  useEffect(() => {
    setQty(String(lotSize));
  }, [lotSize]);

  useEffect(() => {
    if (!ltp) return;
    if (triggerType === "single") {
      if (side === "BUY") {
        const trig = (ltp - 1).toFixed(2);
        const lim = Math.max(ltp - 1, ltp - 0.5).toFixed(2);
        setTriggerPrice(trig);
        setLimitPrice(lim);
      } else {
        const trig = (ltp + 1).toFixed(2);
        const lim = Math.min(ltp + 1, ltp + 0.5).toFixed(2);
        setTriggerPrice(trig);
        setLimitPrice(lim);
      }
    } else {
      if (side === "BUY") {
        setTargetTrigger((ltp + 2).toFixed(2));
        setTargetLimit((ltp + 1.5).toFixed(2));
        setStopTrigger((ltp - 2).toFixed(2));
        setStopLimit((ltp - 2.5).toFixed(2));
      } else {
        setTargetTrigger((ltp - 2).toFixed(2));
        setTargetLimit((ltp - 1.5).toFixed(2));
        setStopTrigger((ltp + 2).toFixed(2));
        setStopLimit((ltp + 2.5).toFixed(2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ltp, side, triggerType]);

  const step = (setter, current, up = true) => {
    const num = Number(current || 0);
    const next = up ? num + TICK : num - TICK;
    setter(next.toFixed(2));
  };

  const stepQty = (up = true) => {
    const current = Math.max(lotSize, floorToMultiple(toInt(qty, lotSize), lotSize));
    const next = up ? current + lotSize : Math.max(lotSize, current - lotSize);
    const clamped = clamp(next, lotSize, maxPerOrderQty);
    setQty(String(clamped));
  };

  const handleQtyChangeText = (text) => {
    const clean = onlyDigits(text);
    const clipped = clean.slice(0, 7);
    if (clipped.length === 0) {
      setQty(String(lotSize));
      return;
    }
    const n = toInt(clipped, lotSize);
    let snapped = floorToMultiple(n, lotSize);
    snapped = clamp(snapped, lotSize, maxPerOrderQty);
    setQty(String(snapped));
  };

  const ocoAllowed = useMemo(() => {
    if (isEquity && side === "BUY") return false;
    return true;
  }, [isEquity, side]);

  useEffect(() => {
    if (triggerType === "oco" && !ocoAllowed) setTriggerType("single");
  }, [ocoAllowed, triggerType]);

  const validateSingleRelation = (s, trig, limit) => {
    if (!Number.isFinite(trig) || !Number.isFinite(limit)) return "Enter valid trigger and limit prices.";
    if (s === "BUY" && !(limit >= trig)) return "For BUY, Limit should be greater than or equal to Trigger.";
    if (s === "SELL" && !(limit <= trig)) return "For SELL, Limit should be less than or equal to Trigger.";
    return null;
  };

  const validateOcoRelations = (entrySide, tgtTrig, tgtLimit, stpTrig, stpLimit) => {
    if (![tgtTrig, tgtLimit, stpTrig, stpLimit].every(Number.isFinite))
      return "Please enter all OCO trigger and limit prices.";
    const exitSide = entrySide === "BUY" ? "SELL" : "BUY";
    if (exitSide === "SELL") {
      if (!(tgtLimit <= tgtTrig)) return "Target: For SELL, Limit should be <= Trigger.";
      if (!(stpLimit <= stpTrig)) return "Stop-loss: For SELL, Limit should be <= Trigger.";
    } else {
      if (!(tgtLimit >= tgtTrig)) return "Target: For BUY, Limit should be >= Trigger.";
      if (!(stpLimit >= stpTrig)) return "Stop-loss: For BUY, Limit should be >= Trigger.";
    }
    return null;
  };

  function buildCommonMeta() {
    const sym = instrument?.tradingsymbol || instrument?.symbol;
    const ex = instrument?.exchange;
    const token =
      instrument?.instrument_token ||
      instrument?.token ||
      instrument?.instrumentToken;

    return {
      challengeId: challengeId || undefined,
      demoAccountType,
      variety: "GTT",
      order_variety: "GTT",
      type: "GTT",
      gtt: true,
      status: "ACTIVE",
      symbol: sym,
      tradingsymbol: sym,
      exchange: ex,
      instrument_token: token,
      instrument,
      client_ts: Date.now(),
    };
  }

  const validateAndBuildPayload = () => {
    const snappedQty = clamp(floorToMultiple(toInt(qty, lotSize), lotSize), lotSize, maxPerOrderQty);
    if (String(snappedQty) !== qty) setQty(String(snappedQty));
    if (!Number.isFinite(snappedQty) || snappedQty < lotSize) {
      safeAlert("Invalid quantity", `Quantity must be at least one lot (${lotSize}) and in multiples of ${lotSize}.`);
      return null;
    }
    const quantity = snappedQty;
    const product = defaultProduct(isEquity);
    const meta = buildCommonMeta();

    if (triggerType === "single") {
      const trig = Number(triggerPrice);
      const limit = Number(limitPrice);
      const err = validateSingleRelation(side, trig, limit);
      if (err) {
        safeAlert("Invalid prices", err);
        return null;
      }
      return {
        ...meta,
        side,
        product,
        trigger_type: "SINGLE",
        quantity,
        trigger_price: Number(trig.toFixed(2)),
        limit_price: Number(limit.toFixed(2)),
      };
    }

    const tgtTrig = Number(targetTrigger);
    const tgtLimit = Number(targetLimit);
    const stpTrig = Number(stopTrigger);
    const stpLimit = Number(stopLimit);
    const err = validateOcoRelations(side, tgtTrig, tgtLimit, stpTrig, stpLimit);
    if (err) {
      safeAlert("Invalid prices", err);
      return null;
    }
    return {
      ...meta,
      side,
      product,
      trigger_type: "OCO",
      quantity,
      target_trigger: Number(tgtTrig.toFixed(2)),
      target_limit: Number(tgtLimit.toFixed(2)),
      stop_trigger: Number(stpTrig.toFixed(2)),
      stop_limit: Number(stpLimit.toFixed(2)),
    };
  };

  const onPlaceGtt = async () => {
    if (placing) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;

    if (typeof availableCash === "number") {
      const approx = estimateRequiredFunds(
        {
          instrument,
          side,
          quantity: payload.quantity,
          limit_price: payload.limit_price ?? payload.target_limit ?? payload.stop_limit,
          trigger_price: payload.trigger_price ?? payload.target_trigger ?? payload.stop_trigger,
        },
        ltp
      );
      if (approx > availableCash) {
        const proceed = await new Promise((resolve) => {
          if (Platform.OS === "web") {
            const ok = window.confirm(
              `Estimated funds required ~ ₹${format2(approx)} exceed available ~ ₹${format2(availableCash)}.\nThe GTT may be rejected on trigger.\n\nProceed anyway?`
            );
            resolve(ok);
          } else {
            Alert.alert(
              "Low funds warning",
              `Estimated funds required ~ ₹${format2(approx)} exceed available ~ ₹${format2(availableCash)}. The GTT may be rejected on trigger. Proceed anyway?`,
              [
                { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
                { text: "Proceed", onPress: () => resolve(true) },
              ]
            );
          }
        });
        if (!proceed) return;
      }
    }

    // Payload for backend
    let apiPayload = { ...payload };
    if (payload.trigger_type === "OCO") {
      apiPayload = {
        ...payload,
        trigger_price: payload.target_trigger,
        limit_price: payload.target_limit,
        stop_trigger_price: payload.stop_trigger,
        stop_limit_price: payload.stop_limit,
      };
    }

    setPlacing(true);
    try {
      const res = await fetch(GTT_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(apiPayload),
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (res.ok) {
        // Write to Firestore so OrdersTab sees it
        const userUid = auth.currentUser?.uid;
        if (userUid && challengeId) {
          const ordersCol = collection(db, "users", userUid, "challenges", String(challengeId), "orders");

          const common = {
            type: "GTT",
            gtt: true,
            variety: "GTT",
            order_variety: "GTT",
            side: payload.side,
            quantity: payload.quantity,
            tradingsymbol:
              payload.tradingsymbol || payload.symbol || payload.instrument?.tradingsymbol || payload.instrument?.symbol,
            symbol:
              payload.symbol || payload.tradingsymbol || payload.instrument?.symbol || payload.instrument?.tradingsymbol,
            exchange: payload.instrument?.exchange || payload.exchange || instrument?.exchange || "NSE",
            status: "ACTIVE",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            trigger_type: payload.trigger_type, // "SINGLE" | "OCO"
            product: payload.product,
            demoAccountType,
            challengeId: challengeId,
          };

          let specific = {};
          if (payload.trigger_type === "SINGLE") {
            specific = withDefined({
              trigger_price: payload.trigger_price,
              limit_price: payload.limit_price,
            });
          } else {
            // For OrdersTab GTT card, expose two triggers as trigger_price and trigger_price2
            specific = withDefined({
              target_trigger: payload.target_trigger,
              target_limit: payload.target_limit,
              stop_trigger: payload.stop_trigger,
              stop_limit: payload.stop_limit,
              trigger_price: payload.target_trigger,  // primary
              trigger_price2: payload.stop_trigger,   // secondary (so GTTOrderCard shows both)
              // Optional: keep limit mirrors if you add them to card later
              limit_price: payload.target_limit,
              stop_limit_price: payload.stop_limit,
            });
          }

          const docToWrite = withDefined({ ...common, ...specific });
          const docRef = await addDoc(ordersCol, docToWrite);

          createdRef.current = { id: docRef.id, ...docToWrite };
        } else {
          // Fallback if no auth context; still allow UI to navigate with a local object
          createdRef.current = withDefined({
            id: data?.id || data?._id || `gtt_${Date.now()}`,
            type: "GTT",
            gtt: true,
            status: "ACTIVE",
            side: payload.side,
            quantity: payload.quantity,
            trigger_type: payload.trigger_type,
            trigger_price: payload.trigger_type === "SINGLE" ? payload.trigger_price : payload.target_trigger,
            trigger_price2: payload.trigger_type === "OCO" ? payload.stop_trigger : undefined,
            tradingsymbol:
              payload.tradingsymbol || payload.symbol || payload.instrument?.tradingsymbol || payload.instrument?.symbol,
            symbol:
              payload.symbol || payload.tradingsymbol || payload.instrument?.symbol || payload.instrument?.tradingsymbol,
            exchange: payload.instrument?.exchange || payload.exchange || instrument?.exchange || "NSE",
            createdAt: new Date().toISOString(),
          });
        }

        setShowPlacedModal(true);
      } else {
        console.error("[GTT] place error:", res.status, data);
        safeAlert("Error", data?.error || `Failed to place GTT order (HTTP ${res.status}).`);
      }
    } catch (err) {
      console.error("[GTT] network error:", err);
      safeAlert("Network error", err?.message || "Could not place GTT order.");
    } finally {
      setPlacing(false);
    }
  };

  const closePlacedModal = () => {
    const created = createdRef.current || null;
    setShowPlacedModal(false); // instant close (animation is none)

    const params = {
      initialTab: "Orders",
      ordersSubTab: "GTT",
      gttRefreshTs: Date.now(),
      challengeId,
      demoAccountType,
      preappendGttOrder: created,
    };

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => navigation.navigate("DemoTrading", params));
    } else {
      navigation.navigate("DemoTrading", params);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[topStyles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={topStyles.side}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.brand} />
        </TouchableOpacity>
        <Text style={[topStyles.title, { color: theme.brand }]}>GTT Orders</Text>
        <View style={topStyles.side} />
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: 34 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="sparkles-outline" size={18} color={theme.brand} />
            <Text style={[styles.cardHeader, { color: theme.brand }]}>Create GTT Order</Text>
          </View>

          <Text style={[styles.instrumentLine, { color: theme.text }]}>
            {(instrument?.tradingsymbol || instrument?.symbol || "Instrument").toString().toUpperCase()}
            {instrument?.exchange ? ` (${instrument.exchange})` : ""}
          </Text>

          {Number.isFinite(ltp) && (
            <View style={styles.ltpPill}>
              <Text style={[styles.ltpLabel, { color: theme.textSecondary }]}>LTP</Text>
              <Text style={[styles.ltpValue, { color: theme.text }]}>{format2(ltp)}</Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Side</Text>
            <View style={styles.segmentWrap}>
              <Segment label="BUY" active={side === "BUY"} onPress={() => setSide("BUY")} activeColor={theme.brand} />
              <Segment label="SELL" active={side === "SELL"} onPress={() => setSide("SELL")} activeColor={theme.error} />
            </View>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Trigger Type</Text>
            <View style={styles.segmentWrap}>
              <Segment label="Single" active={triggerType === "single"} onPress={() => setTriggerType("single")} activeColor={theme.brand} />
              <Segment label="OCO" active={triggerType === "oco"} onPress={() => setTriggerType("oco")} activeColor={theme.brand} disabled={!ocoAllowed} />
            </View>
          </View>

          <View style={styles.rowColumn}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Quantity</Text>
            <Stepper
              value={qty}
              onChangeText={handleQtyChangeText}
              onInc={() => stepQty(true)}
              onDec={() => stepQty(false)}
              theme={theme}
              keyboardType="number-pad"
              maxLength={7}
            />
          </View>

          {triggerType === "single" ? (
            <>
              <View style={styles.helpBox}>
                <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                  A limit order will be placed when the trigger is hit.
                </Text>
              </View>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Trigger</Text>
                <Stepper
                  value={triggerPrice}
                  onChangeText={setTriggerPrice}
                  onInc={() => step(setTriggerPrice, triggerPrice, true)}
                  onDec={() => step(setTriggerPrice, triggerPrice, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Limit Price</Text>
                <Stepper
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                  onInc={() => step(setLimitPrice, limitPrice, true)}
                  onDec={() => step(setLimitPrice, limitPrice, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.helpBox}>
                <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                  OCO places either target or stop-loss order when respective trigger is hit. The other leg is cancelled automatically.
                </Text>
              </View>

              <Text style={[styles.subhead, { color: theme.text }]}>Target</Text>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Trigger</Text>
                <Stepper
                  value={targetTrigger}
                  onChangeText={setTargetTrigger}
                  onInc={() => step(setTargetTrigger, targetTrigger, true)}
                  onDec={() => step(setTargetTrigger, targetTrigger, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Limit Price</Text>
                <Stepper
                  value={targetLimit}
                  onChangeText={setTargetLimit}
                  onInc={() => step(setTargetLimit, targetLimit, true)}
                  onDec={() => step(setTargetLimit, targetLimit, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>

              <Text style={[styles.subhead, { color: theme.text }]}>Stop-loss</Text>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Trigger</Text>
                <Stepper
                  value={stopTrigger}
                  onChangeText={setStopTrigger}
                  onInc={() => step(setStopTrigger, stopTrigger, true)}
                  onDec={() => step(setStopTrigger, stopTrigger, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.rowColumn}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Limit Price</Text>
                <Stepper
                  value={stopLimit}
                  onChangeText={setStopLimit}
                  onInc={() => step(setStopLimit, stopLimit, true)}
                  onDec={() => step(setStopLimit, stopLimit, false)}
                  theme={theme}
                  keyboardType="decimal-pad"
                />
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={onPlaceGtt}
            activeOpacity={placing ? 1 : 0.85}
            style={[styles.placeBtn, { backgroundColor: placing ? "#94a3b8" : theme.brand }]}
            disabled={placing}
          >
            {placing ? (
              <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.placeBtnText}>Placing…</Text>
              </View>
            ) : (
              <Text style={styles.placeBtnText}>Place GTT</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success modal: tick + title only; OK elongated; instant close */}
        <Modal visible={showPlacedModal} animationType="none" transparent onRequestClose={closePlacedModal}>
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.inner, { backgroundColor: theme.card }]}>
              <Ionicons name="checkmark-circle" size={60} color={theme.brand} style={{ marginBottom: 12 }} />
              <Text style={[modalStyles.title, { color: theme.brand }]}>GTT Order Placed</Text>
              <TouchableOpacity style={[modalStyles.okBtn, { backgroundColor: theme.brand }]} onPress={closePlacedModal} activeOpacity={0.9}>
                <Text style={styles.placeBtnText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

function Segment({ label, active, onPress, activeColor, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.9}
      style={[
        segStyles.base,
        { borderColor: disabled ? "#CDD5DF" : activeColor },
        active && !disabled ? { backgroundColor: activeColor } : null,
        disabled ? { backgroundColor: "#ECEFF6", opacity: 0.7 } : null,
      ]}
    >
      <Text
        style={[
          segStyles.text,
          active && !disabled ? { color: "#fff" } : { color: disabled ? "#9CA3AF" : activeColor },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Stepper({ value, onChangeText, onInc, onDec, theme, keyboardType = "decimal-pad", maxLength }) {
  return (
    <View style={[stepStyles.wrap, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <TouchableOpacity style={[stepStyles.btn]} onPress={onDec} activeOpacity={0.8}>
        <Ionicons name="remove" size={18} color={theme.text} />
      </TouchableOpacity>
      <TextInput
        style={[stepStyles.input, { color: theme.text }]}
        value={String(value ?? "")}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        returnKeyType="done"
        maxLength={maxLength}
      />
      <TouchableOpacity style={[stepStyles.btn]} onPress={onInc} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color={theme.text} />
      </TouchableOpacity>
    </View>
  );
}

const topStyles = StyleSheet.create({
  header: {
    height: 44,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  side: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: Platform.OS === "web" ? 0 : 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: "800",
  },
  instrumentLine: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  ltpPill: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#0000000F",
    marginBottom: 6,
  },
  ltpLabel: { fontSize: 12, marginRight: 6, fontWeight: "600" },
  ltpValue: { fontSize: 12, fontWeight: "700" },

  row: { marginTop: 10 },
  rowColumn: { marginTop: 10 },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  segmentWrap: {
    flexDirection: "row",
    gap: 10,
  },
  subhead: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  helpBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#0000000A",
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
  },
  placeBtn: {
    marginTop: 16,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

const segStyles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: 88,
    alignItems: "center",
  },
  text: {
    fontSize: 13.5,
    fontWeight: "800",
  },
});

const stepStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "700",
    minWidth: 80,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#0009",
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    borderRadius: 16,
    padding: 26,
    alignItems: "center",
    maxWidth: 320,
    marginHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 11,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  okBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 200, // elongated width as requested
    alignItems: "center",
    justifyContent: "center",
  },
});