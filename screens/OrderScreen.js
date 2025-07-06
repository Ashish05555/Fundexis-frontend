import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function OrderScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { instrument, side: initialSide = "BUY" } = route.params || {};

  const [side, setSide] = useState(initialSide);
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [gtt, setGtt] = useState(false);
  const [stoploss, setStoploss] = useState(false);
  const [stoplossPrice, setStoplossPrice] = useState("");
  const [notes, setNotes] = useState("");

  // Mock data for margin, brokerage, balance, lotSize, tickSize for now
  const lotSize = instrument?.lotSize || 350;
  const tickSize = instrument?.tick_size || 0.05;
  const approxMargin = 7210.0;
  const brokerage = 28.34;
  const availableBalance = 4883170.0;

  if (!instrument) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>No instrument selected.</Text>
      </View>
    );
  }

  const handleSubmit = () => {
    // Placeholder for order submission
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#222" />
        </TouchableOpacity>
        <Text style={styles.ticker}>
          {instrument.tradingsymbol || instrument.symbol}
        </Text>
        <Text style={styles.priceHeader}>
          {instrument.last_price || "—"}
        </Text>
      </View>

      {/* Side toggle */}
      <View style={styles.sideRow}>
        <Text style={styles.sideLabel}>{side === "BUY" ? "Buy" : "Sell"}</Text>
        <Switch
          value={side === "BUY"}
          onValueChange={(v) => setSide(v ? "BUY" : "SELL")}
          thumbColor={side === "BUY" ? "#1976d2" : "#c62828"}
          trackColor={{ true: "#90caf9", false: "#ffcdd2" }}
        />
      </View>

      {/* Quantity & Price */}
      <View style={styles.row}>
        <View style={{flex: 1}}>
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Quantity"
            value={quantity}
            onChangeText={setQuantity}
          />
          <Text style={styles.subLabel}>lotSize {lotSize}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.label}>Price</Text>
          <TextInput
            style={[styles.input, orderType === "MARKET" && styles.inputDisabled]}
            keyboardType="numeric"
            placeholder="Price"
            value={price}
            onChangeText={setPrice}
            editable={orderType !== "MARKET"}
          />
          <Text style={styles.subLabel}>Tick size {tickSize}</Text>
        </View>
      </View>

      {/* Order Type Tabs */}
      <Text style={[styles.label, {marginTop: 18}]}>Type</Text>
      <View style={styles.tabRow}>
        {["MARKET", "LIMIT", "ADVANCED", "PRACTICE"].map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setOrderType(type)}
            style={[
              styles.tab,
              orderType === type && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                orderType === type && styles.activeTabText,
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* GTT */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>GTT</Text>
        <Switch value={gtt} onValueChange={setGtt} />
      </View>

      {/* Set Stoploss */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Set stoploss</Text>
        <Switch value={stoploss} onValueChange={setStoploss} />
      </View>
      {stoploss && (
        <View style={{marginTop: 8, marginBottom: 12}}>
          <Text style={styles.label}>Stoploss Price</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Enter stoploss price"
            value={stoplossPrice}
            onChangeText={setStoplossPrice}
          />
        </View>
      )}

      {/* Trade Notes */}
      <TextInput
        style={styles.notesInput}
        placeholder="Trade notes"
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {/* Margin, Brokerage, Balance */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoTitle}>Approx. Margin</Text>
          <Text style={styles.infoValue}>₹{approxMargin.toLocaleString()}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoTitle}>Brokerage</Text>
          <Text style={styles.infoValue}>₹{brokerage.toFixed(2)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoTitle}>Available Balance</Text>
          <Text style={styles.infoValue}>₹{availableBalance.toLocaleString()}</Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 18 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    justifyContent: "space-between",
  },
  ticker: { fontSize: 17, fontWeight: "bold", color: "#222" },
  priceHeader: { fontSize: 17, color: "#222" },
  sideRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  sideLabel: { fontSize: 21, fontWeight: "bold", marginRight: 10 },
  row: { flexDirection: "row", marginBottom: 10, gap: 10 },
  label: { fontSize: 15, fontWeight: "bold", marginBottom: 2, color: "#222" },
  subLabel: { color: "#888", fontSize: 12, marginLeft: 2, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 2,
    backgroundColor: "#fff",
  },
  inputDisabled: { backgroundColor: "#eee", color: "#aaa" },
  tabRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#c5cae9",
    borderRadius: 8,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f5f7fa",
  },
  activeTab: { backgroundColor: "#e3f2fd", borderBottomWidth: 2, borderBottomColor: "#1976d2" },
  tabText: { color: "#1976d2", fontSize: 15 },
  activeTabText: { fontWeight: "bold", color: "#1976d2" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 6,
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: 15, color: "#222" },
  notesInput: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#f5f7fa",
    marginTop: 16,
    marginBottom: 8,
    minHeight: 38,
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 10,
    marginVertical: 14,
  },
  infoItem: { alignItems: "flex-start" },
  infoTitle: { color: "#888", fontSize: 12 },
  infoValue: { color: "#333", fontWeight: "bold", fontSize: 14 },
  submitBtn: {
    backgroundColor: "#5286f8",
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    marginTop: 6,
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 17 },
  error: { color: "red", textAlign: "center", marginTop: 50 },
});