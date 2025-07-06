import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Button, Alert } from "react-native";

// Replace with your backend WebSocket and REST API URLs
const REST_API_BASE = "https://your-backend/api";
const WEBSOCKET_URL = "wss://your-backend/api/stream";

export default function WatchlistScreen({ navigation }) {
  const [watchlist, setWatchlist] = useState([
    // Initial mock watchlist; you could fetch this from backend or persistent storage
    { symbol: "RELIANCE", name: "Reliance Industries", instrument_token: "738561" },
    { symbol: "SBIN", name: "State Bank of India", instrument_token: "779521" }
  ]);
  const [liveData, setLiveData] = useState({}); // { [symbol]: { price, change, oi, volume, ... } }
  const [search, setSearch] = useState("");
  const wsRef = useRef(null);

  // Subscribe to WebSocket for all symbols in the watchlist
  useEffect(() => {
    if (watchlist.length === 0) return;
    // Close previous socket if any
    if (wsRef.current) wsRef.current.close();

    // Connect to backend WebSocket
    const ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = () => {
      // Subscribe to multiple symbols (the backend must support this pattern)
      ws.send(JSON.stringify({
        action: "subscribe",
        symbols: watchlist.map(item => item.symbol)
      }));
    };

    ws.onmessage = (event) => {
      // Message should include: { symbol, price, change, oi, volume, ... }
      try {
        const data = JSON.parse(event.data);
        if (data.symbol) {
          setLiveData(prev => ({
            ...prev,
            [data.symbol]: { ...prev[data.symbol], ...data }
          }));
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    };

    ws.onerror = (e) => {
      console.warn("WebSocket error:", e.message);
    };

    ws.onclose = () => {
      // Optionally: try to reconnect after a timeout
      // setTimeout(() => connectSocket(), 3000);
    };

    wsRef.current = ws;

    // Cleanup on unmount
    return () => ws.close();
  }, [JSON.stringify(watchlist)]);

  // Optionally: fetch the watchlist from backend or AsyncStorage in useEffect on mount

  // Add symbol to watchlist (simple version, you may want to fetch from a search API)
  const addToWatchlist = () => {
    if (!search.trim()) return;
    const symbol = search.trim().toUpperCase();
    if (watchlist.find(item => item.symbol === symbol)) {
      Alert.alert("Symbol already in watchlist");
      return;
    }
    // Optionally, fetch instrument details from backend to get name/instrument_token
    setWatchlist([...watchlist, { symbol, name: symbol }]);
    setSearch("");
  };

  // Remove symbol from watchlist
  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(item => item.symbol !== symbol));
    setLiveData(prev => {
      const updated = { ...prev };
      delete updated[symbol];
      return updated;
    });
  };

  // Render each watchlist row
  const renderItem = ({ item }) => {
    const data = liveData[item.symbol] || {};
    const price = data.price !== undefined ? data.price : "--";
    const change = data.change !== undefined ? data.change : "--";
    const oi = data.oi !== undefined ? data.oi : "--";
    const volume = data.volume !== undefined ? data.volume : "--";
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("InstrumentDetails", { symbol: item.symbol })}
      >
        <View style={{ flex: 2 }}>
          <Text style={styles.symbol}>{item.symbol}</Text>
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={styles.dataCell}>
          <Text style={[styles.price, change > 0 ? styles.up : change < 0 ? styles.down : null]}>
            {price}
          </Text>
          <Text style={[styles.change, change > 0 ? styles.up : change < 0 ? styles.down : null]}>
            {change}
          </Text>
        </View>
        <View style={styles.dataCell}>
          <Text style={styles.oi}>OI: {oi}</Text>
          <Text style={styles.volume}>Vol: {volume}</Text>
        </View>
        <TouchableOpacity onPress={() => removeFromWatchlist(item.symbol)}>
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Add to watchlist input */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Add symbol (e.g. TCS)"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={addToWatchlist}
          autoCapitalize="characters"
        />
        <Button title="Add" onPress={addToWatchlist} />
      </View>
      {/* Watchlist Table */}
      <FlatList
        data={watchlist}
        keyExtractor={item => item.symbol}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No symbols in your watchlist.</Text>}
        contentContainerStyle={watchlist.length === 0 && { flex: 1, justifyContent: "center" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 10 },
  addRow: { flexDirection: "row", marginBottom: 14, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 6, padding: 8, marginRight: 8, backgroundColor: "#fff" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    marginVertical: 4,
    padding: 14,
    elevation: 1
  },
  symbol: { fontWeight: "bold", fontSize: 16 },
  name: { color: "#555", fontSize: 13, marginTop: 2 },
  dataCell: { flex: 1, alignItems: "center" },
  price: { fontWeight: "bold", fontSize: 16 },
  change: { fontSize: 13 },
  oi: { fontSize: 12, color: "#888" },
  volume: { fontSize: 12, color: "#888" },
  up: { color: "#388e3c" },
  down: { color: "#c62828" },
  removeBtn: { color: "#c62828", fontSize: 20, paddingLeft: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 60, fontSize: 16 }
});