import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // REMOVED MaterialCommunityIcons
import useRestLivePrices from "../hooks/useRestLivePrices";

function formatPrice(val) {
  return typeof val === "number" ? `₹${val.toLocaleString()}` : "—";
}

const THEME = {
  headerGradient: "#2540F6",
  buy: "#16c784",
  sell: "#f44336",
  accent: "#eef5ff",
  info: "#888",
  priceUp: "#16c784",
  priceDown: "#f44336",
  card: "#fff",
};

export default function InstrumentDetailScreen({ route, navigation }) {
  const instrument = route?.params?.instrument || {};
  const challenge = route?.params?.challenge;

  // Fetch live prices (includes OHLC and last_price)
  const livePrices = useRestLivePrices([instrument.instrument_token], 1000);

  const priceData = livePrices[instrument.instrument_token] || {};
  const lastPrice = priceData.price;
  const ohlc = priceData.ohlc || {};

  // Debug: Show what you get from backend
  console.log("Instrument:", instrument);
  console.log("LivePrices:", livePrices);
  console.log("priceData:", priceData);
  console.log("ohlc:", ohlc);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleBackToSearch = () => {
    const p = route.params || {};
    const searchQuery = p.searchQuery || p.searchText || "";
    const parent = p.searchStackParent;
    const screen = p.searchScreenName;
    const extra = p.searchScreenParams || {};

    if (parent && screen) {
      navigation.navigate(parent, {
        screen,
        params: { ...extra, searchQuery, reopenSearch: true },
      });
      return;
    }
    if (screen) {
      navigation.navigate(screen, { ...extra, searchQuery, reopenSearch: true });
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.accent }}>
      {/* Header */}
      <View style={styles.headerBg}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBackToSearch} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={27} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Instrument Details</Text>
        </View>
        <Text style={styles.name}>{instrument.name ?? "—"}</Text>
        <Text style={styles.exchange}>{instrument.exchange ?? "—"}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(lastPrice)}</Text>
          {/* REMOVED percentage arrow and change! */}
        </View>
      </View>

      {/* Market Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Market Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>Open</Text>
            <Text style={styles.statsValue}>{formatPrice(ohlc.open)}</Text>
            <Text style={[styles.statsLabel, { marginTop: 12 }]}>Day High</Text>
            <Text style={[styles.statsValue, { color: THEME.priceUp }]}>{formatPrice(ohlc.high)}</Text>
          </View>
          <View style={styles.statsCol}>
            <Text style={styles.statsLabel}>Prev. Close</Text>
            <Text style={styles.statsValue}>{formatPrice(ohlc.close)}</Text>
            <Text style={[styles.statsLabel, { marginTop: 12 }]}>Day Low</Text>
            <Text style={[styles.statsValue, { color: THEME.priceDown }]}>{formatPrice(ohlc.low)}</Text>
          </View>
        </View>
      </View>

      {/* Buy/Sell Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() =>
            navigation.navigate("OrderScreen", {
              instrument,
              side: "BUY",
              challenge,
            })
          }
        >
          <Text style={styles.actionBtnText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sellBtn}
          onPress={() =>
            navigation.navigate("OrderScreen", {
              instrument,
              side: "SELL",
              challenge,
            })
          }
        >
          <Text style={styles.actionBtnText}>Sell</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.gttBtn}
        onPress={() =>
          navigation.navigate("GttOrdersScreen", {
            instrument,
            source: "InstrumentDetail",
            challenge,
          })
        }
      >
        <Text style={styles.gttBtnText}>Create GTT</Text>
      </TouchableOpacity>
      <Text style={styles.infoText}>
        Market orders are executed at the best available price
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBg: {
    backgroundColor: THEME.headerGradient,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 24,
    alignItems: "flex-start",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 8,
    width: "100%",
    justifyContent: "flex-start"
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
  name: {
    marginLeft: 18,
    marginTop: 8,
    fontSize: 21,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  exchange: {
    marginLeft: 18,
    fontSize: 15,
    color: "#c7d2fe",
    fontWeight: "600",
    marginBottom: 2,
  },
  priceRow: {
    marginLeft: 18,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 12,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginHorizontal: 12,
    marginTop: -28,
    marginBottom: 10,
    padding: 18,
    shadowColor: "#2540F6",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#232323",
    marginBottom: 13,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsCol: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 13.5,
    color: "#888",
    fontWeight: "600",
    marginBottom: 2,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#232323",
    marginBottom: 2,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  buyBtn: {
    flex: 1,
    backgroundColor: THEME.buy,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 14,
    elevation: 2,
    marginRight: 8,
  },
  sellBtn: {
    flex: 1,
    backgroundColor: THEME.sell,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 14,
    elevation: 2,
    marginLeft: 8,
  },
  actionBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  gttBtn: {
    marginHorizontal: 12,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#dbeafe",
    alignItems: "center",
    paddingVertical: 13,
    elevation: 2,
  },
  gttBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: THEME.headerGradient,
  },
  infoText: {
    marginTop: 15,
    textAlign: "center",
    color: THEME.info,
    fontSize: 13,
    fontWeight: "500",
    marginHorizontal: 15,
  },
});