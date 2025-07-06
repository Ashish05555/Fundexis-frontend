import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function InstrumentDetailScreen({ route, navigation }) {
  const { instrument } = route.params;

  // Dummy data for illustration (replace with real data from your API/instrument object)
  const {
    tradingsymbol = "CDSL25JUN1700CE",
    name = "CDSL 26 Jun 1700 Call",
    oi = 1087,
    change_in_oi = -14,
    open = 10.15,
    high = 22.4,
    low = 7.1,
    close = 10.2,
    last_price = 20.6,
    tot_buy_qty = 114450,
    tot_sell_qty = 45500,
    volume = 0,
    change = 10.4,
    change_pct = 101.96
  } = instrument;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 30}}>
      {/* Title */}
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.symbol}>{tradingsymbol}</Text>

      {/* Buy/Sell Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#2196f3" }]}
          onPress={() => navigation.navigate("OrderScreen", { instrument, side: "BUY" })}
        >
          <Text style={styles.actionButtonText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#e53935" }]}
          onPress={() => navigation.navigate("OrderScreen", { instrument, side: "SELL" })}
        >
          <Text style={styles.actionButtonText}>Sell</Text>
        </TouchableOpacity>
      </View>

      {/* OI & Change in OI */}
      <View style={styles.oiRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.oiLabel}>OI</Text>
          <Text style={styles.oiValue}>{oi}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.oiLabel}>Change in OI</Text>
          <Text style={styles.oiValue}>{change_in_oi}</Text>
        </View>
      </View>

      {/* Price Info */}
      <View style={styles.priceStatsRow}>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>Open</Text>
          <Text style={styles.priceStatValue}>{open}</Text>
        </View>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>High</Text>
          <Text style={styles.priceStatValue}>{high}</Text>
        </View>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>Low</Text>
          <Text style={styles.priceStatValue}>{low}</Text>
        </View>
        <View style={styles.priceStat}>
          <Text style={styles.priceStatLabel}>Close</Text>
          <Text style={styles.priceStatValue}>{close}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Last Price, Tot Buy Qty, Tot Sell Qty, Volume, Change, Change Pct */}
      <View style={styles.statsRow}>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Last Price</Text>
          <Text style={[styles.statsValue, { color: "#389e3c" }]}>{last_price}</Text>
        </View>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Tot Buy Qty</Text>
          <Text style={styles.statsValue}>{tot_buy_qty}</Text>
        </View>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Tot. Sell Qty</Text>
          <Text style={styles.statsValue}>{tot_sell_qty}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Volume</Text>
          <Text style={styles.statsValue}>{volume}</Text>
        </View>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Change</Text>
          <Text style={[styles.statsValue, { color: "#389e3c" }]}>{change}</Text>
        </View>
        <View style={styles.statsBlock}>
          <Text style={styles.statsLabel}>Change Pct%</Text>
          <Text style={[styles.statsValue, { color: "#389e3c" }]}>{change_pct}%</Text>
        </View>
      </View>

      {/* Option Chain & Futures Buttons */}
      <View style={styles.chainRow}>
        <TouchableOpacity style={styles.chainButton}>
          <Text style={styles.chainButtonText}>Option Chain</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chainButton}>
          <Text style={styles.chainButtonText}>Futures</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 2, color: "#222" },
  symbol: { fontSize: 15, color: "#888", marginBottom: 22, fontWeight: "600" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  actionButton: {
    flex: 0.48,
    height: 48,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  oiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  oiLabel: {
    color: "#777",
    fontSize: 15,
    marginBottom: 2,
  },
  oiValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
  },
  priceStatsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  priceStat: { flex: 1, alignItems: "center" },
  priceStatLabel: { fontSize: 13, color: "#888" },
  priceStatValue: { fontSize: 15, fontWeight: "bold", color: "#444" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginVertical: 18,
  },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  statsBlock: { flex: 1, alignItems: "center" },
  statsLabel: { fontSize: 13, color: "#888" },
  statsValue: { fontSize: 15, fontWeight: "bold", color: "#444" },
  chainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 26,
  },
  chainButton: {
    flex: 0.47,
    backgroundColor: "#3949ab",
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: "center",
  },
  chainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});