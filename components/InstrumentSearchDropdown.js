import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import io from "socket.io-client";

// --- USE YOUR CLOUD RUN BACKEND/SOCKET URL ---
const SOCKET_URL = "https://fundexis-backend-758832599619.us-central1.run.app"; // Cloud Run backend

async function fetchMarketStatus() {
  try {
    const res = await fetch("/api/market-status");
    const data = await res.json();
    return data.open || false;
  } catch {
    return false;
  }
}

async function fetchBatchPrices(tokens) {
  if (!tokens.length) return {};
  const qs = encodeURIComponent(tokens.join(","));
  const res = await fetch(`/api/prices/batch?tokens=${qs}`);
  return await res.json();
}

export default function InstrumentSearchDropdown({ data, onSelect }) {
  const [marketOpen, setMarketOpen] = useState(false);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  // --- 1. Check market status on mount ---
  useEffect(() => {
    fetchMarketStatus().then(setMarketOpen);
  }, []);

  // --- 2. Create/cleanup socket only if market is open ---
  useEffect(() => {
    if (marketOpen && !socketRef.current) {
      socketRef.current = io(SOCKET_URL, { transports: ["websocket"] });
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [marketOpen]);

  // --- 3. Subscribe to visible tokens and update prices ---
  useEffect(() => {
    const visibleTokens = data.map(item => String(item.instrument_token));
    if (!visibleTokens.length) return;

    if (marketOpen) {
      setLoading(false);
      const socket = socketRef.current;
      if (!socket) return;

      // Remove previous listener
      socket.off("prices");

      // Subscribe to new tokens
      socket.emit("subscribe", visibleTokens);

      // Listen for prices
      socket.on("prices", (pricesObj) => {
        setPrices(pricesObj || {});
      });

      // Clean up on change
      return () => {
        socket.off("prices");
      };
    } else {
      // REST: fetch prices, refresh every 10s
      setLoading(true);
      const fetchPrices = () => {
        fetchBatchPrices(visibleTokens)
          .then(res => setPrices(res))
          .finally(() => setLoading(false));
      };
      fetchPrices();
      intervalRef.current = setInterval(fetchPrices, 10000);
      return () => clearInterval(intervalRef.current);
    }
  }, [data.map(i => i.instrument_token).join(","), marketOpen]);

  if (!data.length) return null;
  if (!marketOpen && loading) {
    return (
      <View style={{ alignItems: "center", padding: 40 }}>
        <ActivityIndicator size="large" color="#1b8d3c" />
        <Text style={{ marginTop: 8, color: "#888" }}>Loading prices…</Text>
      </View>
    );
  }

  function getDisplayPrice(item) {
    // Accept both {instrument_token: price} and {instrument_token: {price: x}}
    const val = prices[String(item.instrument_token)];
    const price = typeof val === "object" && val !== null ? Number(val.price) : Number(val);
    if (!isNaN(price) && price > 0) {
      return `₹${price}`;
    }
    return "";
  }

  return (
    <View style={styles.dropdownCard}>
      <FlatList
        data={data}
        keyExtractor={item => item.instrument_token.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemRow} onPress={() => onSelect(item)}>
            <View>
              <Text style={styles.symbol}>{item.tradingsymbol}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            {getDisplayPrice(item) !== "" && (
              <Text style={styles.price}>{getDisplayPrice(item)}</Text>
            )}
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="handled"
        style={{ width: "100%" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dropdownCard: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 100,
    maxHeight: 350,
    marginHorizontal: 0,
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f2f2f2",
  },
  symbol: { fontSize: 18, fontWeight: "bold", color: "#222" },
  name: { fontSize: 15, color: "#888", marginTop: 2 },
  price: { fontSize: 18, fontWeight: "bold", color: "#1b8d3c" },
});