import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";
import { db, auth } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { cancelOrder } from "../utils/firestoreOrderActions";
import ExecutedOrderCard from "./ExecutedOrderCard";
import CancelledOrderCard from "./CancelledOrderCard";
import OpenOrderCard from "./OpenOrderCard";
import GTTOrderCard from "./GTTOrderCard";

function isNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function toNumSafe(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const s = v.replace(/[,\s₹INR]/gi, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function formatDate(dateString) {
  if (!dateString) return "--";
  try {
    const d =
      typeof dateString.toDate === "function"
        ? dateString.toDate()
        : new Date(dateString);
    return `${d.getDate()} ${d.toLocaleString("en-IN", {
      month: "short",
    })}, ${d.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } catch {
    return "--";
  }
}

function isToday(dateObj) {
  if (!dateObj) return false;
  let d = dateObj;
  if (typeof d.toDate === "function") d = d.toDate();
  else if (typeof d === "string") d = new Date(d);

  const today = new Date();
  return (
    today.getFullYear() === d.getFullYear() &&
    today.getMonth() === d.getMonth() &&
    today.getDate() === d.getDate()
  );
}

const ORDER_TABS = [
  { key: "open", label: "Open" },
  { key: "executed", label: "Executed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "gtt", label: "GTT" },
];

// Normalize and extract SL fields from an order
function extractSLFields(item) {
  const trigger =
    item.trigger_price ??
    item.triggerPrice ??
    item.sl_trigger ??
    item.stop_trigger ??
    item.stoploss_trigger ??
    item.slTriggerPrice ??
    item.trigger ??
    item.stopPrice ??
    undefined;

  const stoplimit =
    item.stop_limit_price ??
    item.stoploss_limit ??
    item.stop_limit ??
    item.stopLimit ??
    item.sl_limit ??
    item.slLimit ??
    undefined;

  const triggerNum = toNumSafe(trigger);
  const stoplimitNum = toNumSafe(stoplimit);

  const slActive =
    item.slActive === true ||
    String(item.slActive).toLowerCase() === "true" ||
    (isNum(triggerNum) && triggerNum > 0);

  return {
    slActive,
    triggerPrice: slActive && isNum(triggerNum) && triggerNum > 0 ? triggerNum : undefined,
    stoplimitPrice:
      slActive && isNum(stoplimitNum) && stoplimitNum > 0 ? stoplimitNum : undefined,
  };
}

export default function OrdersTab({
  selectedAccount: propAccount,
  tradingDisabled,
  refreshSignal,
  onRefresh,
}) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { selectedChallenge } = useChallenge();
  const account = propAccount || selectedChallenge;

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("open");
  const [instrumentsMeta, setInstrumentsMeta] = useState([]);

  useEffect(() => {
    async function fetchInstrumentsMeta() {
      try {
        const res = await fetch("http://localhost:5000/api/instruments-meta");
        const data = await res.json();
        setInstrumentsMeta(Array.isArray(data) ? data : []);
      } catch {
        setInstrumentsMeta([]);
      }
    }
    fetchInstrumentsMeta();
  }, []);

  useEffect(() => {
    let unsubscribe;
    setLoading(true);

    if (!account || !account.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const userUid = auth.currentUser?.uid;
    const challengeId = account.id;

    const ordersRef = query(
      collection(db, "users", userUid, "challenges", challengeId, "orders"),
      orderBy("createdAt", "desc")
    );

    unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            ...data,
            id: docSnap.id,
            challengeId,
            status: data.status || "—",
            // FIXED: Extract orderType properly from Firestore (LIMIT or MARKET)
            orderType: data.orderType || data.order_type || data.variety || "MARKET",
            variety: data.variety || "NORMAL",
            type: data.type || "REGULAR",
            createdAt: data.createdAt,
            scheduledFor: data.scheduledFor,
            product: data.product,
            product_type: data.product || data.product_type || "NRML",
            exchange: data.exchange,
            margin: data.margin,
            charges: data.charges,
            validity: data.validity,
            reason: data.reason,
            basketId: data.basketId || null,
            price: data.price || data.avg_price || data.average_price || 0,
            trigger_price: data.trigger_price ?? undefined,
            stop_limit_price: data.stop_limit_price ?? undefined,
            stoploss_limit: data.stoploss_limit ?? undefined,
            livePrice: data.livePrice,
            executedAt: data.executedAt || data.updatedAt || data.createdAt,
            cancelledAt: data.cancelledAt || data.updatedAt || data.createdAt,
            tradingsymbol: data.tradingsymbol || data.symbol || "",
            symbol: data.tradingsymbol || data.symbol || "",
            side: data.side || data.transaction_type || "BUY",
            quantity: data.quantity,
            slActive: data.slActive,
          };
        });
        setOrders(docs);
        setLoading(false);
      },
      () => {
        setOrders([]);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [account, refreshSignal]);

  // === Filters for each tab ===
  const listData = useMemo(() => {
    switch (activeTab) {
      case "open":
        return orders.filter(
          (o) =>
            ["OPEN", "PENDING", "PLACED", "SCHEDULED"].includes(
              (o.status || "").toUpperCase()
            ) &&
            (!o.type || o.type.toUpperCase() !== "GTT") &&
            !o.basketId
        );
      case "executed":
        return orders.filter(
          (o) =>
            [
              "EXECUTED",
              "COMPLETED",
              "FILLED",
              "PARTIALLY_FILLED",
              "TRIGGERED",
            ].includes((o.status || "").toUpperCase()) &&
            !o.basketId &&
            isToday(o.executedAt || o.updatedAt || o.createdAt)
        );
      case "cancelled":
        return orders.filter(
          (o) =>
            ["CANCELLED", "CANCELED", "REJECTED", "FAILED"].includes(
              (o.status || "").toUpperCase()
            ) &&
            !o.basketId &&
            isToday(o.cancelledAt || o.updatedAt || o.createdAt)
        );
      case "gtt":
        return orders.filter(
          (o) =>
            ((o.type && o.type.toUpperCase() === "GTT") || o.gtt === true) &&
            !["CANCELLED", "CANCELED", "REJECTED", "FAILED"].includes(
              (o.status || "").toUpperCase()
            )
        );
      default:
        return orders;
    }
  }, [orders, activeTab]);

  const navigateToOrderScreen = (order) => {
    const symbol = order?.tradingsymbol || order?.symbol || "";
    const meta =
      instrumentsMeta.find((m) => m.symbol === symbol) ||
      instrumentsMeta.find(
        (m) =>
          m.symbol &&
          symbol &&
          m.symbol.toUpperCase() === symbol.toUpperCase()
      ) ||
      instrumentsMeta.find(
        (m) =>
          (m.symbol &&
            symbol &&
            m.symbol.toUpperCase().includes(symbol.toUpperCase())) ||
          (m.tradingsymbol &&
            symbol &&
            m.tradingsymbol.toUpperCase().includes(symbol.toUpperCase()))
      );

    const instrument = meta || {
      symbol,
      tradingsymbol: symbol,
      exchange: order?.exchange || "NSE",
    };

    navigation.navigate("OrderScreen", {
      instrument,
      order,
      from: "OrdersTab",
    });
  };

  const navigateToGTTOrderScreen = (order) => {
    const symbol = order?.tradingsymbol || order?.symbol || "";
    const meta =
      instrumentsMeta.find((m) => m.symbol === symbol) ||
      instrumentsMeta.find(
        (m) =>
          m.symbol &&
          symbol &&
          m.symbol.toUpperCase() === symbol.toUpperCase()
      ) ||
      instrumentsMeta.find(
        (m) =>
          (m.symbol &&
            symbol &&
            m.symbol.toUpperCase().includes(symbol.toUpperCase())) ||
          (m.tradingsymbol &&
            symbol &&
            m.tradingsymbol.toUpperCase().includes(symbol.toUpperCase()))
      );

    const instrument = meta || {
      symbol,
      tradingsymbol: symbol,
      exchange: order?.exchange || "NSE",
    };

    navigation.navigate("GttOrdersScreen", {
      instrument,
      order,
      from: "OrdersTab",
      isModify: true,
    });
  };

  const cancelOrderSafe = async (order) => {
    const userUid = auth.currentUser?.uid;
    if (!userUid || !account?.id || !order?.id) {
      throw new Error("Missing user/account/order id");
    }

    try {
      await cancelOrder(account.id, order.id);
      if (typeof onRefresh === "function") onRefresh();
    } catch (err) {
      try {
        const ref = doc(
          db,
          "users",
          userUid,
          "challenges",
          account.id,
          "orders",
          order.id
        );
        await updateDoc(ref, {
          status: "CANCELLED",
          cancelledAt: new Date(),
          reason: "Cancelled by user",
        });
        if (typeof onRefresh === "function") onRefresh();
      } catch (e2) {
        throw new Error(
          err?.message ||
            e2?.message ||
            "Could not cancel order due to an unknown error."
        );
      }
    }
  };

  // Pass orderType as both orderType and order_type (for compatibility with card)
  const renderOrderRow = ({ item }) => {
    const orderTypeValue = item.orderType || item.order_type || item.variety || "MARKET";
    if (activeTab === "executed") {
      return (
        <ExecutedOrderCard
          order={{
            ...item,
            transaction_type: item.side || "BUY",
            quantity: item.quantity,
            filled_quantity: item.filled_quantity || item.quantity,
            avg_price: item.price,
            order_time: formatDate(
              item.executedAt || item.updatedAt || item.createdAt
            ),
            status: item.status || "COMPLETE",
            symbol: item.tradingsymbol || item.symbol,
            exchange: item.exchange,
            product_type: item.product_type || "NRML",
            orderType: orderTypeValue,
            order_type: orderTypeValue,
          }}
        />
      );
    }

    if (activeTab === "cancelled") {
      return (
        <CancelledOrderCard
          order={{
            ...item,
            transaction_type: item.side || "BUY",
            quantity: item.quantity,
            filled_quantity: item.filled_quantity || item.quantity,
            avg_price: item.price,
            status: item.status || "CANCELLED",
            symbol: item.tradingsymbol || item.symbol,
            exchange: item.exchange,
            product_type: item.product_type || "NRML",
            orderType: orderTypeValue,
            order_type: orderTypeValue,
            isAMO: item.variety === "AMO",
            type: item.type,
            gtt: item.gtt,
          }}
        />
      );
    }

    if (activeTab === "open") {
      const isAMO = item.variety === "AMO";
      const openStatus = isAMO ? "SCHEDULED" : item.status || "OPEN";

      const { slActive, triggerPrice, stoplimitPrice } = extractSLFields(item);

      return (
        <OpenOrderCard
          order={{
            ...item,
            status: openStatus,
            isAMO,
            order_variety: item.variety || "REGULAR",
            orderType: orderTypeValue,
            order_type: orderTypeValue,
            slActive,
            trigger_price: triggerPrice,
            stop_limit_price: stoplimitPrice,
            stoploss_limit: stoplimitPrice,
          }}
          inlineConfirm
          onModify={() =>
            navigateToOrderScreen({
              ...item,
              trigger_price: triggerPrice,
              stop_limit_price: stoplimitPrice,
              stoploss_limit: stoplimitPrice,
            })
          }
          onCancelConfirmed={async () => {
            try {
              await cancelOrderSafe(item);
            } catch (err) {
              alert(
                "Cancel Failed: " +
                  (err?.message || "Could not cancel order.")
              );
            }
          }}
        />
      );
    }

    if (activeTab === "gtt") {
      return (
        <GTTOrderCard
          order={{
            ...item,
            orderType: orderTypeValue,
            order_type: orderTypeValue,
          }}
          livePrice={item.livePrice}
          inlineConfirm
          onModify={() => navigateToGTTOrderScreen(item)}
          onCancelConfirmed={async () => {
            try {
              await cancelOrderSafe(item);
            } catch (err) {
              alert(
                "Cancel Failed: " +
                  (err?.message || "Could not cancel GTT.")
              );
            }
          }}
        />
      );
    }

    return null;
  };

  const renderTabs = () => (
    <View style={styles.tabRow}>
      {ORDER_TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabBtn,
            activeTab === tab.key
              ? { backgroundColor: theme.brand, borderBottomColor: theme.brand }
              : {
                  backgroundColor: "#f5f7fa",
                  borderBottomColor: "#e0e3e8",
                },
          ]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? "#fff" : theme.brand },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderTabs()}

      {loading ? (
        <ActivityIndicator size="large" color={theme.brand} />
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderRow}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No orders found in this tab.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 8 },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f5f7fa",
    borderWidth: 1,
    borderColor: "#e0e3e8",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    borderRightWidth: 1,
    borderRightColor: "#e0e3e8",
  },
  tabText: { fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 },
  emptyText: { textAlign: "center", marginTop: 40, fontSize: 15 },
});