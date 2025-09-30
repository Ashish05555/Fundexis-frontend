import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import useLivePrices from "../hooks/useLivePrices";

// Helper to determine if the market is closed (default: 15:30 IST for NSE/BSE)
function isMarketClosed() {
  const now = new Date();
  const closeHour = 15;
  const closeMinute = 30;
  const hour = now.getHours();
  const minute = now.getMinutes();
  return hour > closeHour || (hour === closeHour && minute >= closeMinute);
}

export default function InstrumentSearchDropdown({ data, onSelect }) {
  // Collect all instrument tokens from the passed data
  const instrumentTokens = data.map(item => item.instrument_token);

  // Fetch live prices for all tokens
  const livePrices = useLivePrices(instrumentTokens);

  // Attach live price to each item
  const dataWithPrice = data.map(item => ({
    ...item,
    last_price: livePrices[item.instrument_token]
  }));

  const marketClosed = isMarketClosed();

  // Loading indicator if prices are not available yet
  const allPricesFetched = instrumentTokens.every(token => livePrices[token] !== undefined);

  if (!dataWithPrice.length) return null;
  if (!allPricesFetched) {
    return (
      <View style={{ alignItems: "center", padding: 40 }}>
        <ActivityIndicator size="large" color="#1b8d3c" />
        <Text style={{ marginTop: 8, color: "#888" }}>Loading prices…</Text>
      </View>
    );
  }

  // Price display logic (will show nothing if no price is available)
  function getDisplayPrice(item) {
    if (
      item.last_price !== undefined &&
      item.last_price !== null &&
      Number(item.last_price) > 0
    ) {
      return `₹${item.last_price}`; // Show last price as live/close price
    } else {
      return ""; // Show nothing if price is not available
    }
  }

  return (
    <View style={styles.dropdownCard}>
      <FlatList
        data={dataWithPrice}
        keyExtractor={item => item.instrument_token.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemRow} onPress={() => onSelect(item)}>
            <View>
              <Text style={styles.symbol}>{item.tradingsymbol}</Text>
              <Text style={styles.name}>{item.name}</Text>
            </View>
            {
              getDisplayPrice(item) !== "" && (
                <Text style={styles.price}>
                  {getDisplayPrice(item)}
                </Text>
              )
            }
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