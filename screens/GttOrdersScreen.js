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

// -- Business logic helpers --
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
function withDefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}
function detectIsEquity(instrument) {
  if (!instrument) return true;
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

  // Defensive: always define instrument and ltp
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
              limit_price: payload.target_limit,
              stop_limit_price: payload.stop_limit,
            });
          }

          const docToWrite = withDefined({ ...common, ...specific });
          const docRef = await addDoc(ordersCol, docToWrite);

          createdRef.current = { id: docRef.id, ...docToWrite };
        } else {
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

  // ---- UI redesign ----
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={gttStyles.headerBg}>
        <View style={gttStyles.headerBar}>
          <TouchableOpacity
            style={gttStyles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={27} color="#fff" />
          </TouchableOpacity>
          <Text style={gttStyles.headerTitle}>Create GTT Order</Text>
        </View>
        <View style={gttStyles.headerInfoRow}>
          <View style={{ flex: 1 }}>
            <Text style={gttStyles.name}>
              {(instrument?.tradingsymbol || instrument?.symbol || "Instrument").toString().toUpperCase()}
            </Text>
            <Text style={gttStyles.exchange}>{instrument?.exchange || "NSE"}</Text>
          </View>
          <View style={gttStyles.ltpBox}>
            <Text style={gttStyles.ltpValue}>
              {Number.isFinite(ltp) ? `₹${format2(ltp)}` : "—"}
            </Text>
          </View>
        </View>
      </View>
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={{ paddingBottom: 34 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Order Side */}
          <Text style={[styles.sectionTitle, { marginTop: 0 }]}>Order Side</Text>
          <View style={styles.sideRow}>
            <TouchableOpacity
              style={[
                styles.sideBtn,
                side === "BUY" && styles.sideBuyActive,
              ]}
              onPress={() => setSide("BUY")}
            >
              <Text style={[styles.sideText, side === "BUY" && styles.sideTextBuyActive]}>BUY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sideBtn,
                side === "SELL" && styles.sideSellActive,
              ]}
              onPress={() => setSide("SELL")}
            >
              <Text style={[styles.sideText, side === "SELL" && styles.sideTextSellActive]}>SELL</Text>
            </TouchableOpacity>
          </View>
          {/* Trigger Type */}
          <Text style={styles.sectionTitle}>
            Trigger Type <Ionicons name="information-circle-outline" size={15} color={theme.textSecondary} />
          </Text>
          <View style={styles.triggerTypeRow}>
            <TouchableOpacity
              style={[
                styles.triggerTypeBtn,
                triggerType === "single" && styles.triggerTypeBtnActive,
              ]}
              onPress={() => setTriggerType("single")}
            >
              <Text style={[
                styles.triggerTypeText,
                triggerType === "single" && styles.triggerTypeTextActive
              ]}>Single</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.triggerTypeBtn,
                triggerType === "oco" && styles.triggerTypeBtnActive,
                !ocoAllowed && styles.triggerTypeBtnDisabled,
              ]}
              onPress={() => ocoAllowed && setTriggerType("oco")}
              disabled={!ocoAllowed}
            >
              <Text style={[
                styles.triggerTypeText,
                triggerType === "oco" && styles.triggerTypeTextActive,
                !ocoAllowed && styles.triggerTypeTextDisabled,
              ]}>OCO</Text>
            </TouchableOpacity>
          </View>
          {/* Quantity */}
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.boundaryBox}>
            <View style={styles.quantityRow}>
              <TouchableOpacity style={styles.quantityBtn} onPress={() => stepQty(false)}>
                <Text style={styles.quantityBtnText}>-</Text>
              </TouchableOpacity>
              <View style={styles.quantityBox}>
                <TextInput
                  style={styles.quantityText}
                  value={qty}
                  onChangeText={handleQtyChangeText}
                  keyboardType="numeric"
                  maxLength={7}
                />
              </View>
              <TouchableOpacity style={styles.quantityBtn} onPress={() => stepQty(true)}>
                <Text style={styles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.quantityNote}>
            A limit order will be placed when the trigger price is hit
          </Text>
          {/* Trigger Price & Limit Price */}
          {triggerType === "single" ? (
            <>
              <Text style={styles.sectionTitle}>Trigger Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Enter trigger price"
                  value={triggerPrice}
                  onChangeText={setTriggerPrice}
                />
              </View>
              <Text style={styles.sectionTitle}>Limit Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Enter limit price"
                  value={limitPrice}
                  onChangeText={setLimitPrice}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.subhead}>Target</Text>
              <Text style={styles.sectionTitle}>Trigger Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Target trigger"
                  value={targetTrigger}
                  onChangeText={setTargetTrigger}
                />
              </View>
              <Text style={styles.sectionTitle}>Limit Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Target limit"
                  value={targetLimit}
                  onChangeText={setTargetLimit}
                />
              </View>
              <Text style={styles.subhead}>Stop-loss</Text>
              <Text style={styles.sectionTitle}>Trigger Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Stop-loss trigger"
                  value={stopTrigger}
                  onChangeText={setStopTrigger}
                />
              </View>
              <Text style={styles.sectionTitle}>Limit Price</Text>
              <View style={styles.boundaryBox}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="Stop-loss limit"
                  value={stopLimit}
                  onChangeText={setStopLimit}
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

// Styles (unchanged from previous response)
const gttStyles = StyleSheet.create({
  headerBg: {
    backgroundColor: "#2540F6",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 18,
    alignItems: "flex-start",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 7,
    width: "100%",
  },
  backBtn: {
    padding: 5,
    marginRight: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 8,
  },
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    marginTop: 2,
    paddingHorizontal: 16,
    paddingBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  exchange: {
    fontSize: 15,
    color: "#c7d2fe",
    fontWeight: "600",
    marginBottom: 2,
  },
  ltpBox: {
    alignItems: "flex-end",
    marginLeft: "auto",
    flexDirection: "row",
    gap: 5,
  },
  ltpValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
  },
  subhead: {
    marginTop: 14,
    fontSize: 14,
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232323",
    marginBottom: 11,
    marginTop: 13,
  },
  sideRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 7,
    marginTop: -6,
  },
  sideBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: "#fff",
    alignItems: "center",
    paddingVertical: 13,
    elevation: 1,
    borderColor: "#e3e3e3",
  },
  sideBuyActive: {
    backgroundColor: "#e6fdee",
    borderColor: "#16c784",
  },
  sideSellActive: {
    backgroundColor: "#ffeaea",
    borderColor: "#f44336",
  },
  sideText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#232323",
  },
  sideTextBuyActive: {
    color: "#16c784",
  },
  sideTextSellActive: {
    color: "#f44336",
  },
  triggerTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 7,
    marginTop: -6,
  },
  triggerTypeBtn: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: "#f6f7fb",
    alignItems: "center",
    paddingVertical: 13,
    elevation: 1,
  },
  triggerTypeBtnActive: {
    backgroundColor: "#2540F6",
  },
  triggerTypeBtnDisabled: {
    opacity: 0.5,
  },
  triggerTypeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232323",
    letterSpacing: 0.3,
  },
  triggerTypeTextActive: {
    color: "#fff",
  },
  triggerTypeTextDisabled: {
    color: "#bdbdbd",
  },
  boundaryBox: {
    backgroundColor: "#f2f3f7",
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginBottom: 7,
    paddingHorizontal: 5,
    paddingVertical: 3,
    width: "100%",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 7,
    marginTop: -6,
  },
  quantityBtn: {
    backgroundColor: "#f6f7fb",
    borderRadius: 8,
    padding: 8,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityBtnText: {
    fontSize: 21,
    fontWeight: "700",
    color: "#232323",
  },
  quantityBox: {
    backgroundColor: "#f9f9fd",
    borderRadius: 8,
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232323",
    textAlign: "center",
  },
  quantityNote: {
    fontSize: 12.5,
    color: "#888",
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 2,
  },
  input: {
    marginTop: 4,
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 13,
    fontSize: 17,
    color: "#232323",
    fontWeight: "600",
    borderWidth: 0,
    marginBottom: 3,
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
    minWidth: 200,
    alignItems: "center",
    justifyContent: "center",
  },
});