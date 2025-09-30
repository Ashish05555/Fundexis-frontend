import React, { useState, useEffect, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import instrumentsData from "../data/instruments.json";
import { useLivePrice } from "../context/LivePriceProvider";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";
import { auth, db } from "../firebase";
import { collection, addDoc, doc, updateDoc, deleteField } from "firebase/firestore";
import { executeOrderAndCreateTrade } from "../services/executeTrade";
import { getAllowedProducts } from "../utils/instrumentRules";

const ORDER_TYPES = ["MARKET", "LIMIT"];
const VARIETIES = ["REGULAR", "AMO"];

// --- Helpers ---
function removeUndefined(obj) {
  if (Array.isArray(obj)) return obj.map(removeUndefined);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefined(v)])
    );
  }
  return obj;
}
function isTickMultiple(price, tickSize) {
  return Math.abs(price / tickSize - Math.round(price / tickSize)) < 1e-8;
}
function roundToTick(price, tickSize) {
  const n = Number(price);
  if (!Number.isFinite(n)) return n;
  return Math.round(n / tickSize) * tickSize;
}
function tickDecimals(tickSize) {
  const s = String(tickSize);
  const idx = s.indexOf(".");
  return idx === -1 ? 0 : s.length - idx - 1;
}
function fmtToTick(n, tickSize) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(tickDecimals(tickSize));
}
function getDemoAccountType(challenge) {
  if (challenge?.type && ["1L", "5L", "10L"].includes(challenge.type)) return challenge.type;
  if (challenge?.title) {
    if (challenge.title.includes("1L")) return "1L";
    if (challenge.title.includes("5L")) return "5L";
    if (challenge.title.includes("10L")) return "10L";
  }
  return undefined;
}
function isMarketOpen() {
  const now = new Date();
  const d = now.getDay();
  const h = now.getHours();
  const m = now.getMinutes();
  const wd = d >= 1 && d <= 5;
  const afterOpen = h > 9 || (h === 9 && m >= 15);
  const beforeClose = h < 15 || (h === 15 && m < 30);
  return wd && afterOpen && beforeClose;
}
function isMarketableLimit({ side, limitPrice, refPrice }) {
  if (!limitPrice || !refPrice) return false;
  if (side === "BUY") return limitPrice >= refPrice;
  if (side === "SELL") return limitPrice <= refPrice;
  return false;
}
function zerodhaBrokerage({ product, price, quantity }) {
  if (product === "NRML") return 0;
  const turnover = price * quantity;
  return Math.min(20, 0.0003 * turnover);
}
function zerodhaMargin({ product, price, quantity }) {
  const turnover = price * quantity;
  if (product === "MIS") return turnover / 5;
  return turnover;
}

function lookupTokenBySymbol(sym) {
  if (!sym) return undefined;
  const u = String(sym).toUpperCase();
  const inst =
    instrumentsData.find((m) => String(m.tradingsymbol).toUpperCase() === u) ||
    instrumentsData.find((m) => String(m.symbol).toUpperCase() === u);
  return inst?.instrument_token ? String(inst.instrument_token) : undefined;
}
function resolveInstrumentToken(instrument, order) {
  const direct =
    instrument?.instrument_token ??
    order?.instrument?.instrument_token ??
    order?.instrument_token;
  if (direct != null && Number.isFinite(Number(direct))) return String(direct);
  const sym =
    order?.tradingsymbol ||
    order?.symbol ||
    instrument?.tradingsymbol ||
    instrument?.symbol;
  const looked = lookupTokenBySymbol(sym);
  if (looked) return looked;
  return undefined;
}

export default function OrderScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const contextChallenge = useChallenge().selectedChallenge;

  const {
    instrument: instrumentParam,
    order: orderFromModify,
    side: initialSideParam,
    challenge: challengeParam,
    demoAccountType: demoAccountTypeParam,
  } = route.params || {};

  const modifyMode = !!orderFromModify?.id;
  const instrument = instrumentParam || orderFromModify?.instrument || orderFromModify || {};
  const challenge = challengeParam || contextChallenge;
  const demoAccountType = demoAccountTypeParam || getDemoAccountType(challenge);

  useLayoutEffect(() => {
    navigation.setOptions({ headerBackVisible: false, headerLeft: () => null });
  }, [navigation]);

  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!instrument || Object.keys(instrument).length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.error, marginTop: 50 }}>Instrument data not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 30, alignSelf: "center" }}>
          <Text style={{ color: theme.brand, fontWeight: "bold" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const productOptions = useMemo(() => {
    const meta = {
      exchange: instrument.exchange ?? instrument.segment,
      segment: instrument.segment ?? instrument.instrument_type,
      instrument_type: instrument.instrument_type,
      trading_symbol:
        instrument.trading_symbol ?? instrument.tradingsymbol ?? instrument.symbol,
      symbol: instrument.symbol ?? instrument.tradingsymbol,
    };
    return getAllowedProducts(meta);
  }, [instrument]);

  const [side, setSide] = useState(
    initialSideParam ||
      String(orderFromModify?.transaction_type || orderFromModify?.side || "BUY").toUpperCase()
  );
  const [quantity, setQuantity] = useState(modifyMode ? String(orderFromModify.quantity || 1) : "1");

  const existingType = String(orderFromModify?.order_type || orderFromModify?.type || "MARKET").toUpperCase();
  const existingIsStop = existingType === "STOP_LIMIT" || orderFromModify?.trigger_price != null;
  const [orderType, setOrderType] = useState(modifyMode ? (existingIsStop ? "LIMIT" : existingType) : "MARKET");

  const [product, setProduct] = useState(
    modifyMode ? (orderFromModify?.product || orderFromModify?.product_type || productOptions[0]) : productOptions[0]
  );
  const [variety, setVariety] = useState(modifyMode ? (orderFromModify?.variety || "REGULAR") : "REGULAR");
  const [slActive, setSlActive] = useState(modifyMode ? existingIsStop : false);
  const [triggerPrice, setTriggerPrice] = useState(
    modifyMode && existingIsStop ? String(orderFromModify?.trigger_price ?? "") : ""
  );
  const [limitPrice, setLimitPrice] = useState(
    modifyMode && existingIsStop
      ? String(orderFromModify?.stoploss_limit ?? orderFromModify?.price ?? "")
      : ""
  );
  const [price, setPrice] = useState(
    modifyMode && !existingIsStop ? String(orderFromModify?.price ?? "") : ""
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [marketOpen, setMarketOpen] = useState(isMarketOpen());

  const lotSize = parseInt(instrument?.lotSize || instrument?.lot_size || 1);
  const tickSize = parseFloat(instrument?.tick_size || 0.05);
  const circuitLimit = instrument?.circuit_limit || {};
  const minPrice = circuitLimit.lower ?? undefined;
  const maxPrice = circuitLimit.upper ?? undefined;

  const resolvedToken = useMemo(() => resolveInstrumentToken(instrument, orderFromModify), [instrument, orderFromModify]);
  const livePriceFromFeed = useLivePrice(resolvedToken);

  const lastPrice = useMemo(() => {
    if (typeof livePriceFromFeed === "number" && !Number.isNaN(livePriceFromFeed)) return livePriceFromFeed;
    const o = orderFromModify || {};
    const candidates = [
      o.ltp,
      o.last_price,
      o.avg_price,
      o.executionPrice,
      o.stoploss_limit,
      o.price,
      instrument.last_price,
      instrument.close,
    ];
    for (const c of candidates) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return undefined;
  }, [livePriceFromFeed, orderFromModify, instrument]);

  const limitIsMarketable = useMemo(() => {
    if (orderType !== "LIMIT" || slActive) return false;
    return isMarketableLimit({
      side,
      limitPrice: parseFloat(price),
      refPrice: typeof lastPrice === "number" ? lastPrice : undefined,
    });
  }, [orderType, slActive, side, price, lastPrice]);

  useEffect(() => {
    if (!productOptions.includes(product)) setProduct(productOptions[0]);
  }, [productOptions.join("|")]);

  useEffect(() => {
    if (orderType === "MARKET") {
      if (typeof lastPrice === "number" && !Number.isNaN(lastPrice)) {
        setPrice(fmtToTick(lastPrice, tickSize));
      } else {
        setPrice("");
      }
    }
  }, [orderType, lastPrice, tickSize]);

  useEffect(() => {
    const id = setInterval(() => setMarketOpen(isMarketOpen()), 30000);
    setMarketOpen(isMarketOpen());
    return () => clearInterval(id);
  }, []);

  const isAMO = variety === "AMO";
  const isInvalidLotQuantity =
    !quantity || isNaN(quantity) || parseInt(quantity) <= 0 || parseInt(quantity) % lotSize !== 0;

  const effectivePrice =
    orderType === "MARKET"
      ? Number(lastPrice || 0)
      : Number(parseFloat(slActive ? limitPrice : price) || 0);

  const approxMargin = useMemo(
    () => zerodhaMargin({ product, price: effectivePrice, quantity: parseInt(quantity) || 0 }),
    [product, effectivePrice, quantity]
  );
  const brokerage = useMemo(
    () => zerodhaBrokerage({ product, price: effectivePrice, quantity: parseInt(quantity) || 0 }),
    [product, effectivePrice, quantity]
  );

  const availableBalance = challenge?.balance || challenge?.funding || 0;

  function validateOrder() {
    if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) return "Enter a valid quantity.";
    if (parseInt(quantity) % lotSize !== 0) return `Quantity must be a multiple of lot size (${lotSize}).`;
    if (orderType === "MARKET") {
      if (!(typeof lastPrice === "number" && lastPrice > 0)) return "Live price unavailable for market order.";
      if (slActive && (!triggerPrice || isNaN(triggerPrice) || parseFloat(triggerPrice) <= 0)) return "Enter a valid Trigger price.";
      if (slActive && !isTickMultiple(parseFloat(triggerPrice), tickSize)) return `Trigger price must be a multiple of tick size (${tickSize}).`;
      if (slActive && minPrice && parseFloat(triggerPrice) < minPrice) return `Trigger price cannot be less than lower circuit (${minPrice}).`;
      if (slActive && maxPrice && parseFloat(triggerPrice) > maxPrice) return `Trigger price cannot be more than upper circuit (${maxPrice}).`;
    } else {
      if (slActive) {
        if (!limitPrice || isNaN(limitPrice) || parseFloat(limitPrice) <= 0) return "Enter a valid limit price.";
        if (!triggerPrice || isNaN(triggerPrice) || parseFloat(triggerPrice) <= 0) return "Enter a valid Trigger price.";
        if (!isTickMultiple(parseFloat(limitPrice), tickSize)) return `Limit price must be a multiple of tick size (${tickSize}).`;
        if (!isTickMultiple(parseFloat(triggerPrice), tickSize)) return `Trigger price must be a multiple of tick size (${tickSize}).`;
        if (minPrice && parseFloat(limitPrice) < minPrice) return `Limit price cannot be less than lower circuit (${minPrice}).`;
        if (maxPrice && parseFloat(limitPrice) > maxPrice) return `Limit price cannot be more than upper circuit (${maxPrice}).`;
        if (minPrice && parseFloat(triggerPrice) < minPrice) return `Trigger price cannot be less than lower circuit (${minPrice}).`;
        if (maxPrice && parseFloat(triggerPrice) > maxPrice) return `Trigger price cannot be more than upper circuit (${maxPrice}).`;
        if (
          (side === "SELL" && parseFloat(triggerPrice) <= parseFloat(limitPrice)) ||
          (side === "BUY" && parseFloat(triggerPrice) >= parseFloat(limitPrice))
        ) {
          return `For ${side} SL orders, trigger price should be ${side === "SELL" ? "greater" : "less"} than limit price.`;
        }
      } else {
        if (!price || isNaN(price) || parseFloat(price) <= 0) return "Enter a valid limit price.";
        if (!isTickMultiple(parseFloat(price), tickSize)) return `Price must be a multiple of tick size (${tickSize}).`;
        if (minPrice && parseFloat(price) < minPrice) return `Price cannot be less than lower circuit (${minPrice}).`;
        if (maxPrice && parseFloat(price) > maxPrice) return `Price cannot be more than upper circuit (${maxPrice}).`;
      }
    }
    if (approxMargin > availableBalance) return "Insufficient balance for margin.";
    if (isAMO && marketOpen) return "AMO orders can be placed only when market is closed.";
    if (!isAMO && !marketOpen) return "Market is closed. Use AMO to schedule for next open.";
    return "";
  }

  const willAutoUpgradeToStopLimit = useMemo(() => {
    if (orderType !== "LIMIT" || slActive) return false;
    const px = parseFloat(price);
    if (!Number.isFinite(px) || !Number.isFinite(lastPrice)) return false;
    return (side === "BUY" && px > lastPrice) || (side === "SELL" && px < lastPrice);
  }, [orderType, slActive, side, price, lastPrice]);

  const handlePreview = () => {
    const validation = validateOrder();
    if (validation) {
      setErrorMsg(validation);
      return;
    }
    setErrorMsg("");

    const px =
      orderType === "MARKET" ? Number(lastPrice || 0) : Number(parseFloat(slActive ? limitPrice : price) || 0);
    const roundedPx = roundToTick(px, tickSize);

    setPreviewData({
      tradingsymbol: instrument.tradingsymbol || instrument.symbol,
      side,
      quantity,
      price: roundedPx,
      orderType: willAutoUpgradeToStopLimit ? "STOP_LIMIT (auto)" : orderType,
      product,
      variety,
      marginRequired: approxMargin,
      charges: brokerage,
      availableBalance,
      slActive: slActive || willAutoUpgradeToStopLimit,
      triggerPrice: slActive ? roundToTick(parseFloat(triggerPrice), tickSize) : (willAutoUpgradeToStopLimit ? roundedPx : undefined),
      limitPrice: slActive ? roundToTick(parseFloat(limitPrice), tickSize) : (willAutoUpgradeToStopLimit ? roundedPx : undefined),
      autoUpgraded: willAutoUpgradeToStopLimit,
    });
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    setErrorMsg("");
    setLoading(true);

    if (!demoAccountType) {
      setLoading(false);
      setErrorMsg(`Demo account type is missing or invalid. Challenge object: ${JSON.stringify(challenge)}`);
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setErrorMsg("You must be logged in.");
      return;
    }
    const userId = user.uid;
    const challengeId = challenge?.id || challenge?.challengeId || challenge?.docId;
    if (!userId || !challengeId) {
      setLoading(false);
      setErrorMsg("Could not resolve userId or challengeId for order placement.");
      return;
    }

    const typedLimit = parseFloat(price);
    const roundedLimit = Number.isFinite(typedLimit) ? roundToTick(typedLimit, tickSize) : undefined;
    const roundedTrigger = Number.isFinite(parseFloat(triggerPrice)) ? roundToTick(parseFloat(triggerPrice), tickSize) : undefined;
    const roundedStopLimit = Number.isFinite(parseFloat(limitPrice)) ? roundToTick(parseFloat(limitPrice), tickSize) : undefined;

    let finalType = orderType;
    let finalSlActive = slActive;
    let finalTrigger = slActive ? roundedTrigger : undefined;
    let finalStopLimit = slActive ? roundedStopLimit : undefined;
    let finalDisplayPrice =
      orderType === "MARKET" ? Number(lastPrice || 0) : (slActive ? roundedStopLimit : roundedLimit);

    if (orderType === "LIMIT" && !slActive && Number.isFinite(lastPrice) && Number.isFinite(roundedLimit)) {
      const wantsWait = (side === "BUY" && roundedLimit > lastPrice) || (side === "SELL" && roundedLimit < lastPrice);
      if (wantsWait) {
        finalType = "STOP_LIMIT";
        finalSlActive = true;
        finalTrigger = roundedLimit;
        finalStopLimit = roundedLimit;
        finalDisplayPrice = roundedLimit;
      }
    }

    const isREGULAR = variety === "REGULAR";

    try {
      if (!modifyMode) {
        const payloadBase = {
          tradingsymbol: instrument.tradingsymbol || instrument.symbol,
          exchange: instrument.exchange ?? instrument.segment,
          quantity: parseInt(quantity),
          product,
          variety,
          demoAccountType,
          transaction_type: side,
          instrument,
          createdAt: new Date().toISOString(),
          slActive: !!finalSlActive,
        };

        const orderPayload = removeUndefined({
          ...payloadBase,
          order_type: finalType,
          price: finalType === "MARKET" ? Number(lastPrice || 0) : (finalType === "LIMIT" ? finalDisplayPrice : undefined),
          trigger_price: finalType === "STOP_LIMIT" ? finalTrigger : undefined,
          stoploss_limit: finalType === "STOP_LIMIT" ? finalStopLimit : undefined,
          price_type: finalType,
          status: isAMO ? "SCHEDULED" : finalType === "MARKET" ? "TO_EXECUTE" : "PENDING",
          triggered: finalType === "STOP_LIMIT" ? false : undefined,
        });

        const ordersRef = collection(db, "users", userId, "challenges", challengeId, "orders");
        const orderDoc = await addDoc(ordersRef, orderPayload);
        const orderId = orderDoc.id;

        if (isREGULAR) {
          if (finalType === "MARKET") {
            await executeOrderAndCreateTrade({ userId, challengeId, orderId, ltp: lastPrice || finalDisplayPrice || 0 });
          } else if (finalType === "LIMIT") {
            await executeOrderAndCreateTrade({ userId, challengeId, orderId, ltp: lastPrice || 0 });
          }
        }
      } else {
        const orderId = orderFromModify.id;
        const orderRef = doc(db, "users", userId, "challenges", challengeId, "orders", orderId);

        const baseUpdate = {
          updatedAt: new Date().toISOString(),
          tradingsymbol: orderFromModify.tradingsymbol || instrument.tradingsymbol || instrument.symbol,
          exchange: orderFromModify.exchange || instrument.exchange || instrument.segment,
          transaction_type: side,
          quantity: parseInt(quantity),
          product,
          variety,
          order_type: finalType,
          price_type: finalType,
          slActive: !!finalSlActive,
          status: isAMO ? "SCHEDULED" : finalType === "MARKET" ? "TO_EXECUTE" : "PENDING",
        };

        const updatePayload = { ...baseUpdate };
        if (finalType === "STOP_LIMIT") {
          updatePayload.trigger_price = finalTrigger;
          updatePayload.stoploss_limit = finalStopLimit;
          updatePayload.price = deleteField();
          updatePayload.triggered = false;
          updatePayload.triggeredAt = deleteField();
        } else if (finalType === "LIMIT") {
          updatePayload.price = finalDisplayPrice;
          updatePayload.trigger_price = deleteField();
          updatePayload.stoploss_limit = deleteField();
          updatePayload.triggered = deleteField();
          updatePayload.triggeredAt = deleteField();
        } else if (finalType === "MARKET") {
          updatePayload.price = Number(lastPrice || finalDisplayPrice || 0);
          updatePayload.trigger_price = deleteField();
          updatePayload.stoploss_limit = deleteField();
          updatePayload.triggered = deleteField();
          updatePayload.triggeredAt = deleteField();
        }

        await updateDoc(orderRef, removeUndefined(updatePayload));

        if (isREGULAR && finalType === "MARKET") {
          await executeOrderAndCreateTrade({
            userId,
            challengeId,
            orderId,
            ltp: lastPrice || finalDisplayPrice || 0,
          });
        }
        if (isREGULAR && finalType === "LIMIT") {
          await executeOrderAndCreateTrade({ userId, challengeId, orderId, ltp: lastPrice || 0 });
        }
      }

      setLoading(false);
      setShowPreview(false);
      setShowConfirmation(true);
    } catch (err) {
      setLoading(false);
      setShowPreview(false);
      setErrorMsg(err.message || (modifyMode ? "Update failed." : "Order failed."));
    }
  };

  const incLot = () => setQuantity((q) => String(parseInt(q || "0") + lotSize));
  const decLot = () =>
    setQuantity((q) => {
      const nq = parseInt(q || "0") - lotSize;
      return nq > 0 ? String(nq) : String(lotSize);
    });

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.brand} />
        </TouchableOpacity>
        <Text style={[styles.ticker, { color: theme.brand }]}>{instrument.tradingsymbol || instrument.symbol}</Text>
        <Text style={[styles.priceHeader, { color: theme.brand }]}>
          {typeof lastPrice === "number" && !Number.isNaN(lastPrice) ? fmtToTick(lastPrice, tickSize) : <ActivityIndicator size="small" />}
        </Text>
      </View>

      <View style={styles.sideRow}>
        <Text style={[styles.sideLabel, { color: side === "BUY" ? theme.brand : theme.error }]}>{side === "BUY" ? "Buy" : "Sell"}</Text>
        <Switch
          value={side === "BUY"}
          onValueChange={(v) => setSide(v ? "BUY" : "SELL")}
          thumbColor={side === "BUY" ? theme.brand : theme.error}
          trackColor={{ true: theme.brand + "44", false: theme.error + "33" }}
        />
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.text }]}>Quantity</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={[styles.lotBtn, { backgroundColor: theme.card }]} onPress={decLot}>
              <Text style={[styles.lotBtnText, { color: theme.brand }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              keyboardType="numeric"
              placeholder="Quantity"
              placeholderTextColor={theme.textSecondary}
              value={quantity}
              onChangeText={setQuantity}
            />
            <TouchableOpacity style={[styles.lotBtn, { backgroundColor: theme.card }]} onPress={incLot}>
              <Text style={[styles.lotBtnText, { color: theme.brand }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>lotSize {lotSize}</Text>
          {isInvalidLotQuantity && (
            <View style={[styles.smallErrorTab, { backgroundColor: theme.error + "10" }]}>
              <Text style={[styles.smallErrorText, { color: theme.error }]}>
                Invalid quantity: Must be a multiple of lot size ({lotSize})
              </Text>
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: theme.text }]}>Price</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              (orderType === "MARKET" || (orderType === "LIMIT" && slActive)) && styles.inputDisabled,
            ]}
            keyboardType="numeric"
            placeholder={
              orderType === "MARKET"
                ? "Market uses LTP"
                : slActive
                ? "Set in Limit below"
                : "Price"
            }
            placeholderTextColor={theme.textSecondary}
            value={
              orderType === "MARKET"
                ? typeof lastPrice === "number"
                  ? fmtToTick(lastPrice, tickSize)
                  : ""
                : slActive
                ? ""
                : price
            }
            onChangeText={setPrice}
            editable={orderType === "LIMIT" && !slActive}
          />
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>Tick size {tickSize}</Text>
        </View>
      </View>

      <Text style={[styles.label, { marginTop: 18, color: theme.text }]}>Variety</Text>
      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        {VARIETIES.map((v) => {
          const disabled = v === "AMO" ? marketOpen : !marketOpen;
          return (
            <TouchableOpacity
              key={v}
              onPress={() => !disabled && setVariety(v)}
              style={[
                styles.tab,
                { backgroundColor: theme.card },
                variety === v && { backgroundColor: theme.brand + "22", borderBottomColor: theme.brand, borderBottomWidth: 2 },
                disabled && { opacity: 0.5 },
              ]}
              disabled={disabled}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: variety === v ? theme.brand : theme.textSecondary },
                  variety === v && { fontWeight: "bold" },
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: 18, color: theme.text }]}>Order Type</Text>
      <View style={[styles.tabRow, { borderColor: theme.border }]}>
        {ORDER_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => {
              setOrderType(type);
              if (type === "MARKET") setSlActive(false);
            }}
            style={[
              styles.tab,
              { backgroundColor: theme.card },
              orderType === type && { backgroundColor: theme.brand + "22", borderBottomColor: theme.brand, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: orderType === type ? theme.brand : theme.textSecondary },
                orderType === type && { fontWeight: "bold" },
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.row, { alignItems: "center" }]}>
        <Text style={[styles.label, { color: theme.text }]}>Product</Text>
        {productOptions.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.prodBtn, { backgroundColor: theme.card }, product === p && { backgroundColor: theme.brand }]}
            onPress={() => setProduct(p)}
          >
            <Text style={product === p ? [styles.activeProdText, { color: theme.white }] : [styles.prodText, { color: theme.textSecondary }]}>{p}</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flex: 1, alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end" }}>
          <Text style={{ color: theme.text, marginRight: 6 }}>SL</Text>
          <Switch
            value={slActive}
            onValueChange={setSlActive}
            thumbColor={slActive ? theme.brand : theme.border}
            trackColor={{ true: theme.brand + "44", false: theme.border + "33" }}
          />
        </View>
      </View>

      {slActive && (
        <View style={{ marginTop: 8, marginBottom: 12 }}>
          <Text style={[styles.label, { color: theme.text }]}>Trigger Price</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            keyboardType="numeric"
            placeholder="Enter trigger price"
            placeholderTextColor={theme.textSecondary}
            value={triggerPrice}
            onChangeText={setTriggerPrice}
          />
          {orderType === "LIMIT" && (
            <>
              <Text style={[styles.label, { color: theme.text, marginTop: 8 }]}>Limit Price</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                keyboardType="numeric"
                placeholder="Enter limit price"
                placeholderTextColor={theme.textSecondary}
                value={limitPrice}
                onChangeText={setLimitPrice}
              />
              <Text style={[styles.subLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                For {side} SL: Trigger should be {side === "SELL" ? "greater than" : "less than"} Limit.
              </Text>
            </>
          )}
        </View>
      )}

      {orderType === "LIMIT" && !slActive && limitIsMarketable && (
        <View style={[styles.smallErrorTab, { backgroundColor: "#FFF4F2" }]}>
          <Text style={[styles.smallErrorText, { color: "#B22" }]}>
            This LIMIT is away from current price. It will be placed as a Stop‑Limit behind the scenes and execute when price reaches ₹{price}.
          </Text>
        </View>
      )}

      <View style={[styles.infoBar, { backgroundColor: theme.card }]}>
        <View style={styles.infoItem}>
          <Text style={[styles.infoTitle, { color: theme.textSecondary }]}>Approx. Margin</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>₹{approxMargin.toLocaleString()}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoTitle, { color: theme.textSecondary }]}>Brokerage</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>₹{Number(brokerage).toFixed(2)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={[styles.infoTitle, { color: theme.textSecondary }]}>Available Balance</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>₹{availableBalance.toLocaleString()}</Text>
        </View>
      </View>

      {!!errorMsg && <Text style={[styles.error, { color: theme.error }]}>{errorMsg}</Text>}

      <TouchableOpacity
        style={[styles.placeOrderBtn, { backgroundColor: !!validateOrder() ? "#aaa" : theme.brand }]}
        onPress={handlePreview}
        disabled={loading || !!validateOrder()}
      >
        <Text style={styles.submitText}>{modifyMode ? "Update Order" : "Place Order"}</Text>
      </TouchableOpacity>

      {showPreview && previewData && (
        <Modal visible={showPreview} transparent animationType="fade">
          <View style={styles.previewModalOverlay}>
            <View style={[styles.previewModal, { backgroundColor: theme.card }]}>
              <Text style={[styles.previewTitle, { color: theme.brand }]}>{modifyMode ? "Modify Order" : "Order Preview"}</Text>
              <Text style={{ color: theme.text }}>Symbol: {previewData.tradingsymbol}</Text>
              <Text style={{ color: theme.text }}>Side: {previewData.side}</Text>
              <Text style={{ color: theme.text }}>Quantity: {previewData.quantity}</Text>
              <Text style={{ color: theme.text }}>
                Price: {previewData.price} {orderType === "MARKET" ? "(Market/LTP)" : ""}
              </Text>
              <Text style={{ color: theme.text }}>Variety: {previewData.variety}</Text>
              <Text style={{ color: theme.text }}>Order Type: {previewData.orderType}</Text>
              <Text style={{ color: theme.text }}>Product: {previewData.product}</Text>
              {previewData.slActive && (
                <>
                  <Text style={{ color: theme.text }}>Trigger Price: {previewData.triggerPrice}</Text>
                  {orderType === "LIMIT" && <Text style={{ color: theme.text }}>Limit Price: {previewData.limitPrice}</Text>}
                </>
              )}
              {previewData.autoUpgraded && !modifyMode && (
                <Text style={{ color: "#B22", marginTop: 6 }}>
                  Note: Your LIMIT has been auto‑converted to Stop‑Limit (trigger=limit) to wait until price reaches your level.
                </Text>
              )}
              <Text style={{ color: theme.text, marginTop: 8 }}>
                Margin Required: ₹{previewData.marginRequired.toLocaleString()}
              </Text>
              <Text style={{ color: theme.text }}>Charges: ₹{Number(previewData.charges).toFixed(2)}</Text>
              <Text style={{ color: theme.text }}>
                Available Balance: ₹{previewData.availableBalance.toLocaleString()}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmText}>{modifyMode ? "Confirm & Update" : "Confirm & Place"}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPreview(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={showConfirmation} transparent animationType="fade">
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}
          activeOpacity={1}
          onPress={() => setShowConfirmation(false)}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 36,
              alignItems: "center",
              elevation: 13,
              shadowColor: "#22b573",
              shadowOpacity: 0.22,
              shadowRadius: 24,
            }}
          >
            <Ionicons name="checkmark-circle" size={64} color="#22b573" />
            <Text style={{ fontSize: 22, fontWeight: "bold", marginTop: 8, color: "#22b573" }}>
              {modifyMode ? "Order Updated!" : "Order Placed!"}
            </Text>
            <Text style={{ marginTop: 10, color: "#333", textAlign: "center" }}>
              {modifyMode ? "Your order changes have been saved successfully." : "Your order has been placed successfully."}
            </Text>
            <TouchableOpacity
              style={{ marginTop: 18, backgroundColor: "#22b573", borderRadius: 8, paddingHorizontal: 28, paddingVertical: 12, alignItems: "center" }}
              onPress={() => {
                setShowConfirmation(false);
                navigation.goBack();
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Go Back</Text>
            </TouchableOpacity>
            <Text style={{ color: "#888", marginTop: 10, fontSize: 13 }}>Tap anywhere to dismiss</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 18, justifyContent: "space-between" },
  ticker: { fontSize: 17, fontWeight: "bold" },
  priceHeader: { fontSize: 17 },
  sideRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  sideLabel: { fontSize: 21, fontWeight: "bold", marginRight: 10 },
  row: { flexDirection: "row", marginBottom: 10, gap: 10, alignItems: "center" },
  label: { fontSize: 15, fontWeight: "bold", marginBottom: 2 },
  subLabel: { fontSize: 12, marginLeft: 2, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 2, minWidth: 60, flex: 1 },
  inputDisabled: { backgroundColor: "#eee", color: "#aaa" },
  tabRow: { flexDirection: "row", marginBottom: 12, marginTop: 8, borderRadius: 8, overflow: "hidden" },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabText: { fontSize: 15 },
  prodBtn: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14, marginHorizontal: 4 },
  prodText: { fontSize: 14 },
  activeProdText: { fontWeight: "bold", fontSize: 14 },
  lotBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 2, marginHorizontal: 2, alignItems: "center" },
  lotBtnText: { fontSize: 19, fontWeight: "bold" },
  infoBar: { flexDirection: "row", justifyContent: "space-between", borderRadius: 8, padding: 10, marginVertical: 14 },
  infoItem: { alignItems: "flex-start" },
  infoTitle: { fontSize: 12 },
  infoValue: { fontWeight: "bold", fontSize: 14 },
  placeOrderBtn: { borderRadius: 6, padding: 14, alignItems: "center", marginTop: 6 },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  error: { textAlign: "center", marginTop: 14, marginBottom: 7 },
  smallErrorTab: { borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10, marginTop: 6, alignSelf: "flex-start", minWidth: "65%" },
  smallErrorText: { fontSize: 13, textAlign: "left", fontWeight: "600" },
  previewModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.18)", justifyContent: "center", alignItems: "center" },
  previewModal: { width: "88%", borderRadius: 18, padding: 22, elevation: 8, alignItems: "flex-start" },
  previewTitle: { fontWeight: "bold", fontSize: 20, marginBottom: 13 },
  confirmBtn: { backgroundColor: "#27ae60", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center", marginRight: 10 },
  confirmText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  cancelBtn: { backgroundColor: "#c0392b", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, alignItems: "center" },
  cancelText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});