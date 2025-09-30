import React, { useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useLivePrice } from "../context/LivePriceProvider";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

// Market hours helper
function isMarketClosed() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isOpen =
    day >= 1 &&
    day <= 5 &&
    ((hour > 9 || (hour === 9 && minute >= 15)) &&
      (hour < 15 || (hour === 15 && minute < 30)));
  return !isOpen;
}

export default function InstrumentDetailScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { instrument } = route.params || {};
  const instrumentToken = (instrument?.instrument_token || instrument?.token || "").toString();
  const exchange = instrument?.exchange || "NSE";
  const tradingsymbol = instrument?.tradingsymbol;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Instrument Details",
      headerBackVisible: false,
      headerLeft: () => null,
    });
  }, [navigation]);

  // LIVE PRICE - use context and refresh subscription on focus
  const livePrice = useLivePrice(instrumentToken);

  useFocusEffect(
    React.useCallback(() => {
      // Focus triggers subscription in useLivePrice
      return () => {
        // Unsubscribe handled by useLivePrice on unfocus/unmount
      };
    }, [instrumentToken])
  );

  // Determine the live price
  const marketClosed = isMarketClosed();
  let lastPrice;
  if (marketClosed) {
    lastPrice = instrument?.close ?? instrument?.last_price ?? "—";
  } else {
    lastPrice =
      typeof livePrice === "number" && livePrice !== 0
        ? livePrice
        : instrument?.last_price ?? instrument?.close ?? "—";
  }

  if (!instrument || !instrumentToken) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.error }]}>
          Instrument data not found.
        </Text>
      </View>
    );
  }

  // Show error only if market is open and no price is available
  const showNoLivePriceWarning =
    !marketClosed &&
    (lastPrice === "—" || lastPrice === undefined || lastPrice === null);

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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={styles.titleRow}>
        <TouchableOpacity onPress={handleBackToSearch} style={styles.blueBackBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.brand} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.brand }]}>{tradingsymbol}</Text>
        <Text style={[styles.exchange, { color: theme.textSecondary }]}>
          ({exchange})
        </Text>
      </View>

      <View style={styles.livePriceContainer}>
        <Text style={[styles.livePriceLabel, { color: theme.textSecondary }]}>
          {marketClosed ? "Last Price" : "Live Price"}
        </Text>
        {lastPrice === "—" || lastPrice === undefined || lastPrice === null ? (
          <ActivityIndicator size="small" color={theme.brand} />
        ) : (
          <Text style={[styles.livePriceValue, { color: theme.brand }]}>
            {`₹${lastPrice}`}
          </Text>
        )}
        {showNoLivePriceWarning && (
          <Text style={{ color: theme.error, fontSize: 12, marginTop: 6 }}>
            Unable to fetch live price. Check network, token, or backend.
          </Text>
        )}
      </View>

      <View style={styles.buySellRow}>
        <TouchableOpacity
          style={[styles.buyButton, { backgroundColor: theme.brand }]}
          onPress={() =>
            navigation.navigate("OrderScreen", {
              instrument: { ...instrument, last_price: lastPrice },
              side: "BUY",
            })
          }
        >
          <Text style={styles.buyText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sellButton, { backgroundColor: theme.error }]}
          onPress={() =>
            navigation.navigate("OrderScreen", {
              instrument: { ...instrument, last_price: lastPrice },
              side: "SELL",
            })
          }
        >
          <Text style={styles.sellText}>Sell</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gttRow}>
        <TouchableOpacity
          style={[styles.gttButton, { backgroundColor: theme.brand }]}
          onPress={() =>
            navigation.navigate("GttOrdersScreen", {
              instrument: { ...instrument, last_price: lastPrice },
              source: "InstrumentDetail",
            })
          }
          activeOpacity={0.85}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.gttText}>Create GTT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },
  error: { fontSize: 18, marginTop: 40, textAlign: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  blueBackBtn: {
    paddingVertical: 2,
    paddingRight: 2,
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 2 },
  exchange: { fontSize: 14, fontWeight: "600", marginBottom: 0 },
  livePriceContainer: { alignItems: "center", marginBottom: 10 },
  livePriceLabel: { fontSize: 13 },
  livePriceValue: { fontSize: 22, fontWeight: "bold", marginTop: 2 },
  buySellRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 10,
    gap: 12,
  },
  buyButton: {
    flex: 1,
    marginRight: 4,
    borderRadius: 6,
    alignItems: "center",
    padding: 16,
  },
  sellButton: {
    flex: 1,
    marginLeft: 4,
    borderRadius: 6,
    alignItems: "center",
    padding: 16,
  },
  buyText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  sellText: { color: "#fff", fontWeight: "bold", fontSize: 18 },
  gttRow: {
    marginTop: 6,
  },
  gttButton: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    flexDirection: "row",
  },
  gttText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});