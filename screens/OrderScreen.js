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
  Platform,
  Modal,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import instrumentsData from "../data/instruments.json";
import { useTheme } from "../context/ThemeContext";
import { getAllowedProducts } from "../utils/instrumentRules";
import useRestLivePrices from "../hooks/useRestLivePrices";
import { db } from "../firebase";
import { auth } from "../firebase";
import { doc, collection, addDoc, serverTimestamp } from "firebase/firestore";

const ORDER_TYPES = ["MARKET", "LIMIT"];
const VARIETIES = ["REGULAR", "AMO"];

// Utility to check if market is open (NSE: 09:15-15:30 IST)
function isMarketOpen() {
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes();
  // Market open 09:15 <= time < 15:30
  const open = (hours > 9 || (hours === 9 && mins >= 15)) && (hours < 15 || (hours === 15 && mins < 30));
  return open;
}

function extractPrice(val) {
  if (typeof val === "number") return val;
  if (val && typeof val === "object") {
    if (typeof val.price === "number") return val.price;
    if (typeof val.last_price === "number") return val.last_price;
    if (typeof val.ltp === "number") return val.ltp;
  }
  return undefined;
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
function getDemoAccountType(challenge) {
  if (challenge?.type && ["1L", "5L", "10L"].includes(challenge.type)) return challenge.type;
  if (challenge?.challengeType && ["1L", "5L", "10L"].includes(challenge.challengeType)) return challenge.challengeType;
  if (challenge?.title) {
    if (challenge.title.includes("1L")) return "1L";
    if (challenge.title.includes("5L")) return "5L";
    if (challenge.title.includes("10L")) return "10L";
  }
  return undefined;
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

// Firestore Order Save
async function placeOrderAPI(orderDetails) {
  if (!orderDetails.challengeId || !orderDetails.userId) {
    return { success: false, message: "Missing challenge or user info" };
  }
  try {
    // Clean order details: remove undefineds, ensure symbol and other fields are strings
    const cleanOrderDetails = { ...orderDetails };
    cleanOrderDetails.symbol =
      orderDetails.symbol ||
      orderDetails.tradingsymbol ||
      orderDetails.instrument_name ||
      "";
    Object.keys(cleanOrderDetails).forEach((key) => {
      if (cleanOrderDetails[key] === undefined) cleanOrderDetails[key] = null;
    });

    const ordersCollection = collection(
      db,
      "users",
      orderDetails.userId,
      "challenges",
      orderDetails.challengeId,
      "orders"
    );
    await addDoc(ordersCollection, {
      ...cleanOrderDetails,
      createdAt: serverTimestamp(),
      status: "open",
      variety: orderDetails.variety,
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message || "Order save failed" };
  }
}

export default function OrderScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const {
    instrument: instrumentParam,
    order: orderFromModify,
    side: initialSideParam,
    challenge: challengeParam,
    demoAccountType: demoAccountTypeParam,
  } = route.params || {};

  const modifyMode = !!orderFromModify?.id;
  const instrument = instrumentParam || orderFromModify?.instrument || orderFromModify || {};
  const challenge = challengeParam;
  const demoAccountType = demoAccountTypeParam || getDemoAccountType(challenge);

  const productOptions = useMemo(() => {
    const meta = {
      exchange: instrument.exchange ?? instrument.segment,
      segment: instrument.segment ?? instrument.instrument_type,
      instrument_type: instrument.instrument_type,
      trading_symbol: instrument.trading_symbol ?? instrument.tradingsymbol ?? instrument.symbol,
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const lotSize = parseInt(instrument?.lotSize || instrument?.lot_size || 1);
  const tickSize = parseFloat(instrument?.tick_size || 0.05);
  const resolvedToken = useMemo(() => resolveInstrumentToken(instrument, orderFromModify), [instrument, orderFromModify]);
  
  // LIVE PRICE EVERY SECOND
  const restPrices = useRestLivePrices(resolvedToken ? [resolvedToken] : [], 1000);
  const livePriceFromFeed = extractPrice(restPrices[resolvedToken]);
  
  const lastPrice = useMemo(() => {
    if (typeof livePriceFromFeed === "number" && !Number.isNaN(livePriceFromFeed)) return livePriceFromFeed;
    const o = orderFromModify || {};
    const candidates = [
      extractPrice(o.ltp),
      extractPrice(o.last_price),
      extractPrice(o.avg_price),
      extractPrice(o.executionPrice),
      extractPrice(o.stoploss_limit),
      extractPrice(o.price),
      extractPrice(instrument.last_price),
      extractPrice(instrument.close),
    ];
    for (const c of candidates) {
      if (typeof c === "number" && c > 0) return c;
    }
    return undefined;
  }, [livePriceFromFeed, orderFromModify, instrument]);

  useEffect(() => {
    if (orderType === "MARKET") {
      if (typeof lastPrice === "number" && !Number.isNaN(lastPrice)) {
        setPrice(fmtToTick(lastPrice, tickSize));
      } else {
        setPrice("");
      }
    }
  }, [orderType, lastPrice, tickSize]);

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
  const availableBalance = challenge?.balance != null
    ? challenge.balance
    : (challenge?.funding != null
      ? challenge.funding
      : 0);

  const incLot = () => setQuantity((q) => String(parseInt(q || "0") + lotSize));
  const decLot = () =>
    setQuantity((q) => {
      const nq = parseInt(q || "0") - lotSize;
      return nq > 0 ? String(nq) : String(lotSize);
    });

  // --- VARIETY LOGIC ---
  const marketOpen = isMarketOpen();
  useEffect(() => {
    if (marketOpen && variety !== "REGULAR") {
      setVariety("REGULAR");
    }
    if (!marketOpen && variety !== "AMO") {
      setVariety("AMO");
    }
  }, [marketOpen, variety]);
  const allowedVarieties = marketOpen ? ["REGULAR"] : ["AMO"];
  // --- END VARIETY LOGIC ---

  // ---- PLACE ORDER LOGIC ----
  async function handlePlaceOrder() {
    if (!allowedVarieties.includes(variety)) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const userId = auth.currentUser?.uid;
      const challengeId = challenge?.challengeId || challenge?.id;
      // Fix for symbol field: fallback to tradingsymbol/name if missing
      const orderSymbol =
        instrument.symbol ||
        instrument.tradingsymbol ||
        instrument.name ||
        "";

      if (!userId || !challengeId) {
        setErrorMsg("Missing user/challenge info");
        setLoading(false);
        return;
      }
      const response = await placeOrderAPI({
        symbol: orderSymbol,
        tradingsymbol: instrument.tradingsymbol || "",
        instrument_name: instrument.name || "",
        quantity: parseInt(quantity),
        price: effectivePrice,
        side,
        orderType,
        variety,
        product,
        slActive,
        triggerPrice,
        limitPrice,
        challengeId,
        userId,
      });
      if (response.success) {
        setShowSuccessModal(true);
        setTimeout(() => setShowSuccessModal(false), 1200);
      } else {
        setErrorMsg(response.message || "Order failed");
      }
    } catch (e) {
      setErrorMsg("Order failed: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }
  // ---------------------------

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#eef5ff" }} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={orderStyles.headerBg}>
        <View style={orderStyles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={orderStyles.backBtn}>
            <Ionicons name="chevron-back" size={27} color="#fff" />
          </TouchableOpacity>
          <Text style={orderStyles.headerTitle}>Order</Text>
        </View>
        <View style={orderStyles.headerInfoRow}>
          <View>
            <Text style={orderStyles.name}>{instrument.tradingsymbol || instrument.symbol}</Text>
            <Text style={orderStyles.exchange}>{instrument.exchange || "NSE"}</Text>
          </View>
          <View style={orderStyles.priceBox}>
            <Text style={orderStyles.priceValue}>
              {typeof lastPrice === "number" && !Number.isNaN(lastPrice)
                ? fmtToTick(lastPrice, tickSize)
                : <ActivityIndicator size="small" color="#fff" />}
            </Text>
          </View>
        </View>
      </View>
      <View style={orderStyles.card}>
        {/* Order Side */}
        <Text style={orderStyles.sectionTitle}>Order Side</Text>
        <View style={orderStyles.sideRow}>
          <TouchableOpacity
            style={[
              orderStyles.sideBtn,
              side === "BUY" ? orderStyles.buyActive : orderStyles.buyInactive,
            ]}
            onPress={() => setSide("BUY")}
          >
            <Text style={[
              orderStyles.sideText,
              side === "BUY" ? orderStyles.buyTextActive : orderStyles.buyTextInactive
            ]}>BUY</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              orderStyles.sideBtn,
              side === "SELL" ? orderStyles.sellActive : orderStyles.sellInactive,
            ]}
            onPress={() => setSide("SELL")}
          >
            <Text style={[
              orderStyles.sideText,
              side === "SELL" ? orderStyles.sellTextActive : orderStyles.sellTextInactive
            ]}>SELL</Text>
          </TouchableOpacity>
        </View>
        {/* Quantity and Price */}
        <View style={orderStyles.qtyPriceRow}>
          <View style={orderStyles.qtyCol}>
            <Text style={orderStyles.label}>Quantity</Text>
            <View style={orderStyles.quantityOuterFixed}>
              <TouchableOpacity style={orderStyles.quantityBtnFixed} onPress={decLot}>
                <Text style={orderStyles.quantityBtnText}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={orderStyles.quantityTextFixed}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                maxLength={7}
                placeholder="Quantity"
                placeholderTextColor="#888"
                selectionColor="#2540F6"
                underlineColorAndroid="transparent"
                autoCorrect={false}
                autoCapitalize="none"
                textAlign="center"
                caretColor="#2540F6"
                editable={true}
              />
              <TouchableOpacity style={orderStyles.quantityBtnFixed} onPress={incLot}>
                <Text style={orderStyles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={orderStyles.subLabel}>lotSize {lotSize}</Text>
            {isInvalidLotQuantity && (
              <View style={orderStyles.smallErrorTab}>
                <Text style={orderStyles.smallErrorText}>
                  Invalid quantity: Must be a multiple of lot size ({lotSize})
                </Text>
              </View>
            )}
          </View>
          <View style={orderStyles.qtyCol}>
            <Text style={orderStyles.label}>Price</Text>
            <View style={orderStyles.priceOuterFixed}>
              <TextInput
                style={[
                  orderStyles.priceInputFixed,
                  orderType === "MARKET" && orderStyles.priceInputMarket,
                ]}
                keyboardType="numeric"
                placeholder="Price"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor="#888"
                selectionColor="#2540F6"
                underlineColorAndroid="transparent"
                textAlign="center"
                caretColor="#2540F6"
                editable={orderType !== "MARKET"}
              />
            </View>
            <Text style={orderStyles.subLabel}>Tick size {tickSize}</Text>
          </View>
        </View>
        {/* Variety Tabs */}
        <Text style={orderStyles.label}>Variety</Text>
        <View style={orderStyles.tabRow}>
          {VARIETIES.map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => {
                if (allowedVarieties.includes(v)) setVariety(v);
              }}
              style={[
                orderStyles.tab,
                variety === v && orderStyles.tabActive,
                !allowedVarieties.includes(v) && { opacity: 0.5 },
              ]}
              disabled={!allowedVarieties.includes(v)}
            >
              <Text style={[
                orderStyles.tabText,
                variety === v && orderStyles.tabTextActive,
                !allowedVarieties.includes(v) && { color: "#aaa" },
              ]}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Order Type Tabs */}
        <Text style={orderStyles.label}>Order Type</Text>
        <View style={orderStyles.tabRow}>
          {ORDER_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => {
                setOrderType(type);
                if (type === "MARKET") setSlActive(false);
              }}
              style={[
                orderStyles.tab,
                orderType === type && orderStyles.tabActive,
              ]}
            >
              <Text style={[
                orderStyles.tabText,
                orderType === type && orderStyles.tabTextActive,
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Product (MIS fixed), SL Toggle */}
        <View style={orderStyles.prodRow}>
          <View style={orderStyles.prodBadge}>
            <Text style={orderStyles.prodBadgeText}>MIS</Text>
          </View>
          <View style={orderStyles.prodSwitchRow}>
            <Text style={orderStyles.prodSwitchLabel}>SL</Text>
            <Switch
              value={slActive}
              onValueChange={setSlActive}
              thumbColor={slActive ? "#2540F6" : "#ccc"}
              trackColor={{ true: "#2540F6", false: "#ccc" }}
            />
          </View>
        </View>
        {/* SL details */}
        {slActive && (
          <View>
            <Text style={orderStyles.label}>Trigger Price</Text>
            <View style={orderStyles.priceOuterFixed}>
              <TextInput
                style={orderStyles.priceInputFixed}
                keyboardType="numeric"
                placeholder="Enter trigger price"
                value={triggerPrice}
                onChangeText={setTriggerPrice}
                placeholderTextColor="#888"
                selectionColor="#2540F6"
                underlineColorAndroid="transparent"
                textAlign="center"
                caretColor="#2540F6"
                editable={true}
              />
            </View>
            {orderType === "LIMIT" && (
              <>
                <Text style={orderStyles.label}>Limit Price</Text>
                <View style={orderStyles.priceOuterFixed}>
                  <TextInput
                    style={orderStyles.priceInputFixed}
                    keyboardType="numeric"
                    placeholder="Enter limit price"
                    value={limitPrice}
                    onChangeText={setLimitPrice}
                    placeholderTextColor="#888"
                    selectionColor="#2540F6"
                    underlineColorAndroid="transparent"
                    textAlign="center"
                    caretColor="#2540F6"
                    editable={true}
                  />
                </View>
                <Text style={orderStyles.subLabel}>
                  For {side} SL: Trigger should be {side === "SELL" ? "greater than" : "less"} than Limit.
                </Text>
              </>
            )}
          </View>
        )}
        {/* Margin/Charges display */}
        <View style={orderStyles.infoBar}>
          <View style={orderStyles.infoItem}>
            <Text style={orderStyles.infoTitle}>Approx. Margin</Text>
            <Text style={orderStyles.infoValue}>₹{approxMargin.toLocaleString()}</Text>
          </View>
          <View style={orderStyles.infoItem}>
            <Text style={orderStyles.infoTitle}>Brokerage</Text>
            <Text style={orderStyles.infoValue}>₹{Number(brokerage).toFixed(2)}</Text>
          </View>
          <View style={orderStyles.infoItem}>
            <Text style={orderStyles.infoTitle}>Available Balance</Text>
            <Text style={orderStyles.infoValue}>₹{availableBalance.toLocaleString()}</Text>
          </View>
        </View>
        {/* Place Order Button */}
        <TouchableOpacity
          style={[
            orderStyles.placeOrderBtn,
            !!errorMsg ? orderStyles.placeOrderBtnDisabled : (side === "BUY" ? orderStyles.buyActive : orderStyles.sellActive)
          ]}
          onPress={handlePlaceOrder}
          disabled={!!errorMsg || !allowedVarieties.includes(variety) || loading}
        >
          <Text style={orderStyles.placeOrderText}>{loading ? "Placing..." : "Place Order"}</Text>
        </TouchableOpacity>
        {!!errorMsg && (
          <Text style={[orderStyles.errorText, { color: "#f44336" }]}>{errorMsg}</Text>
        )}
        {/* Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={{
            flex: 1, backgroundColor: "rgba(0,0,0,0.30)",
            alignItems: "center", justifyContent: "center"
          }}>
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 32,
              alignItems: "center",
              elevation: 12,
              minWidth: 200,
            }}>
              <Ionicons name="checkmark-circle-outline" size={48} color="#16c784" />
              <Text style={{ fontWeight: "bold", fontSize: 19, color: "#16c784", marginTop: 8 }}>Order Placed!</Text>
              <Text style={{ color: "#555", marginTop: 5 }}>Your order has been scheduled.</Text>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

const orderStyles = StyleSheet.create({
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
  backBtn: { padding: 5, marginRight: 2 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#fff", marginLeft: 8 },
  headerInfoRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    marginTop: 2,
    paddingHorizontal: 16,
    paddingBottom: 2,
    justifyContent: "space-between",
  },
  name: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  exchange: { fontSize: 15, color: "#c7d2fe", fontWeight: "600", marginBottom: 2 },
  priceBox: { alignItems: "flex-end", justifyContent: "center", minWidth: 80 },
  priceValue: { fontSize: 17, fontWeight: "700", color: "#fff" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: -18,
    marginBottom: 10,
    padding: 18,
    shadowColor: "#2540F6",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: "#e3e3e3",
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#232323", marginBottom: 11, marginTop: 13 },
  sideRow: { flexDirection: "row", gap: 10, marginBottom: 7, marginTop: -6 },
  sideBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    paddingVertical: 13,
    elevation: 1,
  },
  buyActive: { backgroundColor: "#16c784", borderColor: "#16c784" },
  buyInactive: { backgroundColor: "#fff", borderColor: "#16c784" },
  buyTextActive: { color: "#fff", fontWeight: "bold" },
  buyTextInactive: { color: "#16c784", fontWeight: "bold" },
  sellActive: { backgroundColor: "#f44336", borderColor: "#f44336" },
  sellInactive: { backgroundColor: "#fff", borderColor: "#f44336" },
  sellTextActive: { color: "#fff", fontWeight: "bold" },
  sellTextInactive: { color: "#f44336", fontWeight: "bold" },
  sideText: { fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  qtyPriceRow: { flexDirection: "row", gap: 16, marginBottom: 10, marginTop: 8 },
  qtyCol: { flex: 1, minWidth: 0 },

  quantityOuterFixed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderRadius: 8,
    borderColor: "#e3e3e3",
    backgroundColor: "#F6F6FA",
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 0,
    height: 44,
    width: "100%",
  },
  quantityBtnFixed: {
    backgroundColor: "#F6F7FB",
    borderRadius: 8,
    padding: 8,
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
    flexShrink: 0,
  },
  quantityTextFixed: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232323",
    textAlign: "center",
    backgroundColor: "#fff",
    minWidth: 70,
    maxWidth: 120,
    flexGrow: 0,
    paddingHorizontal: 0,
    marginHorizontal: 0,
    outlineWidth: 0,
    outlineColor: "transparent",
    caretColor: "#2540F6",
    borderWidth: 0,
    height: 40,
    fontFamily: Platform.OS === "web" ? "monospace" : undefined,
  },
  priceOuterFixed: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 8,
    borderColor: "#e3e3e3",
    backgroundColor: "#F6F6FA",
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 0,
    height: 44,
    width: "100%",
    overflow: "hidden",
    marginBottom: 4,
  },
  priceInputFixed: {
    borderWidth: 0,
    borderRadius: 8,
    padding: 0,
    fontSize: 18,
    minWidth: 60,
    flex: 1,
    backgroundColor: "#fff",
    color: "#232323",
    outlineWidth: 0,
    outlineColor: "transparent",
    caretColor: "#2540F6",
    textAlign: "center",
    height: 40,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    opacity: 1,
  },
  priceInputMarket: {
    color: "#888",
    backgroundColor: "#f4f4f4",
    opacity: 0.7,
  },
  subLabel: { fontSize: 12, marginLeft: 2, marginBottom: 4 },
  smallErrorTab: {
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 6,
    alignSelf: "flex-start",
    minWidth: "65%",
    backgroundColor: "#FFF4F2",
  },
  smallErrorText: { fontSize: 13, textAlign: "left", fontWeight: "600", color: "#f44336" },
  tabRow: { flexDirection: "row", marginBottom: 12, marginTop: 8, borderRadius: 8, overflow: "hidden" },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e3e3e3",
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabActive: { backgroundColor: "#2540F6", borderColor: "#2540F6" },
  tabText: { fontSize: 15, color: "#232323" },
  tabTextActive: { color: "#fff", fontWeight: "bold" },
  prodRow: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 },
  prodBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#e0e7ff",
    borderRadius: 12,
    marginRight: 7,
  },
  prodBadgeText: { fontWeight: "700", color: "#2540F6", fontSize: 15 },
  prodSwitchRow: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  prodSwitchLabel: { fontSize: 15, color: "#232323", marginRight: 8 },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 8,
    padding: 10,
    marginVertical: 14,
    backgroundColor: "#eef5ff",
    borderWidth: 2,
    borderColor: "#e3e3e3",
  },
  infoItem: { alignItems: "flex-start" },
  infoTitle: { fontSize: 12, color: "#888" },
  infoValue: { fontWeight: "bold", fontSize: 14, color: "#232323" },
  placeOrderBtn: {
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    marginTop: 6,
  },
  placeOrderBtnDisabled: {
    backgroundColor: "#aaa",
  },
  placeOrderText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
  },
  errorText: {
    textAlign: "center",
    marginTop: 14,
    marginBottom: 7,
    color: "#f44336",
  },
});