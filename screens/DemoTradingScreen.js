import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import instrumentsData from "../data/instruments.json";
import useLivePrices from "../hooks/useLivePrices";

// Helper function to get challenge name based on amount
const getChallengeName = (amount) => {
  if (amount === 100000) return "Basic Challenge";
  if (amount === 500000) return "Standard Challenge";
  if (amount === 1000000) return "Premium Challenge";
  return `Custom Challenge (₹${amount.toLocaleString()})`;
};

// Simulate fetching user's bought challenge accounts from backend
const mockFetchAccounts = async () => [
  {
    id: "1",
    name: getChallengeName(100000), // "Basic Challenge"
    phase: 1,
    phaseStartBalance: 100000,
    phaseProfitTarget: 10000,
    phaseOneCompleted: false,
    phaseTwoCompleted: false,
    balance: 103000,
    totalProfit: 3000,
    bought: true
  },
  {
    id: "2",
    name: getChallengeName(500000), // "Standard Challenge"
    phase: 1,
    phaseStartBalance: 500000,
    phaseProfitTarget: 50000,
    phaseOneCompleted: false,
    phaseTwoCompleted: false,
    balance: 510000,
    totalProfit: 10000,
    bought: true
  },
  {
    id: "3",
    name: getChallengeName(1000000), // "Premium Challenge"
    phase: 2,
    phaseStartBalance: 1000000,
    phaseProfitTarget: 100000,
    phaseOneCompleted: true,
    phaseTwoCompleted: false,
    balance: 1110000,
    totalProfit: 110000,
    bought: true
  }
];
// Each object above is ONE challenge/account, regardless of phase.

export default function DemoTradingScreen() {
  const livePrices = useLivePrices();
  const navigation = useNavigation();
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [trades, setTrades] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch accounts and set default
  useEffect(() => {
    (async () => {
      setLoading(true);
      const accountsData = await mockFetchAccounts();
      setAccounts(accountsData);
      setSelectedAccount(accountsData[0]);
      setLoading(false);
    })();
  }, []);

  if (loading || !selectedAccount) return <ActivityIndicator style={{ flex: 1 }} />;

  // Instrument search filter
  const filteredInstruments = instrumentQuery.trim()
    ? instrumentsData.filter(
        (inst) =>
          inst.tradingsymbol
            ?.toLowerCase()
            .includes(instrumentQuery.toLowerCase()) ||
          inst.name?.toLowerCase().includes(instrumentQuery.toLowerCase())
      )
    : instrumentsData;

  // Phase profit calculation
  const phaseProfit = selectedAccount.balance - selectedAccount.phaseStartBalance;

  // Total PNL Calculation (as per positions)
  const totalPNL = trades.reduce((sum, trade) => {
    const currPrice = livePrices[trade.instrument_token] || trade.entryPrice;
    return (
      sum +
      (trade.side === "BUY"
        ? (currPrice - trade.entryPrice) * trade.quantity
        : (trade.entryPrice - currPrice) * trade.quantity)
    );
  }, 0);

  // UI Components
  function renderAccountDashboard() {
    return (
      <View style={styles.statusCard}>
        <TouchableOpacity
          onPress={() => setAccountModalVisible(true)}
          style={styles.accountSelector}
        >
          <Text style={styles.selectedAccountName}>{selectedAccount.name}</Text>
          <Text style={{ color: "#007AFF" }}>▼</Text>
        </TouchableOpacity>
        <Text style={styles.sectionHeader}>Account Status</Text>
        <Text style={styles.challengeName}>
          Challenge: ₹{selectedAccount.phaseStartBalance.toLocaleString()}
        </Text>
        <View style={styles.balanceRow}>
          <Text>
            Phase:{" "}
            <Text style={styles.highlight}>
              {selectedAccount.phaseTwoCompleted ? "Completed" : selectedAccount.phase}
            </Text>
          </Text>
          <Text>
            Balance:{" "}
            <Text style={styles.balanceHighlight}>
              ₹
              {selectedAccount.balance.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </Text>
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text>
            Target:{" "}
            <Text style={styles.highlight}>
              ₹{selectedAccount.phaseProfitTarget.toLocaleString()}
            </Text>
          </Text>
          <Text>
            Profit:{" "}
            <Text style={styles.highlight}>
              ₹
              {phaseProfit.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </Text>
          </Text>
        </View>
        <View style={styles.phaseStatus}>
          <Text style={styles.phaseInfo}>
            {selectedAccount.phaseTwoCompleted
              ? "🎉 Both Phases Completed! Challenge Complete!"
              : selectedAccount.phase === 1
              ? "Phase 1 in progress"
              : "Phase 2 in progress"}
          </Text>
        </View>
      </View>
    );
  }

  function renderAccountModal() {
    // Only show unique challenge accounts, NOT phases!
    return (
      <Modal
        visible={accountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAccountModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.accountModalBackdrop}
          onPress={() => setAccountModalVisible(false)}
          activeOpacity={1}
        >
          <View style={styles.accountModalContent}>
            <Text style={styles.accountModalTitle}>Select Challenge Account</Text>
            <FlatList
              data={accounts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.accountOption,
                    item.id === selectedAccount.id && styles.accountOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedAccount(item);
                    setAccountModalVisible(false);
                  }}
                >
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: "#333" }}>Balance: ₹{item.balance}</Text>
                  {/* Do not show phase here, since it's part of account's dashboard */}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  function renderTotalPNLCard() {
    const isProfit = totalPNL >= 0;
    return (
      <View style={styles.totalPnlCard}>
        <Text style={styles.totalPnlLabel}>Total P&amp;L</Text>
        <Text style={[styles.totalPnlValue, isProfit ? styles.pnlPositive : styles.pnlNegative]}>
          {isProfit ? "+" : ""}
          {totalPNL.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    );
  }

  function renderTradeHistory() {
    return (
      <View style={styles.historySection}>
        <Text style={styles.sectionHeader}>Trade History</Text>
        {trades.length === 0 ? (
          <Text style={styles.emptyText}>No trades yet.</Text>
        ) : (
          trades.map((trade) => (
            <View key={trade.id} style={styles.tradeHistoryCard}>
              <Text style={styles.tradeHistorySymbol}>{trade.symbol}</Text>
              <Text>
                {trade.side} {trade.quantity} @ ₹{trade.entryPrice} ({trade.orderType}) {trade.time}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  }

  // Handle instrument selection: Navigate to detail screen
  const handleInstrumentPress = (instrument) => {
    navigation.navigate("InstrumentDetail", { instrument });
  };

  return (
    <View style={styles.container}>
      {renderAccountDashboard()}
      {renderAccountModal()}
      {renderTotalPNLCard()}
      {/* Instrument Search */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search instrument (as in Zerodha)..."
        value={instrumentQuery}
        onChangeText={setInstrumentQuery}
        placeholderTextColor="#888"
      />
      <FlatList
        data={instrumentQuery.trim() ? filteredInstruments : []}
        keyExtractor={(item) => item.instrument_token.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.instrumentCard}
            onPress={() => handleInstrumentPress(item)}
          >
            <View>
              <Text style={styles.symbolText}>{item.tradingsymbol}</Text>
              <Text style={styles.nameText}>{item.name}</Text>
            </View>
            <Text style={styles.priceText}>
              {livePrices[item.instrument_token]
                ? `₹${livePrices[item.instrument_token]}`
                : "No price"}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          instrumentQuery.trim() === ""
            ? null
            : <Text style={styles.emptyText}>No instruments found</Text>
        }
        style={{ maxHeight: 250, marginBottom: 12 }}
      />
      {renderTradeHistory()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  // Account selector styles
  accountSelector: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f3f7fc",
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: "space-between"
  },
  selectedAccountName: { fontWeight: "bold", fontSize: 16, color: "#007aff" },
  accountModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center"
  },
  accountModalContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 24,
    width: "80%"
  },
  accountModalTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
    color: "#007aff"
  },
  accountOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#f5f5f5"
  },
  accountOptionSelected: {
    backgroundColor: "#cce6ff"
  },
  // Status card
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  challengeName: {
    fontSize: 15,
    color: "#007AFF",
    marginBottom: 8,
    fontWeight: "600",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  highlight: { color: "#007AFF", fontWeight: "600" },
  balanceHighlight: { color: "#388e3c", fontWeight: "600" },
  phaseStatus: { marginTop: 12 },
  phaseInfo: { color: "#007AFF", fontWeight: "600", fontSize: 15 },
  // Total PNL Card (smaller version)
  totalPnlCard: {
    marginTop: 10,
    marginBottom: 20,
    alignSelf: "center",
    width: "70%",
    borderRadius: 12,
    backgroundColor: "#f5f7fa",
    paddingVertical: 14,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  totalPnlLabel: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
    letterSpacing: 0.2,
  },
  totalPnlValue: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  pnlPositive: { color: "#388e3c" },
  pnlNegative: { color: "#e53935" },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 8,
    color: "#333",
  },
  instrumentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  symbolText: { fontSize: 16, fontWeight: "600", color: "#333" },
  nameText: { fontSize: 14, color: "#666", marginTop: 2 },
  priceText: { fontSize: 15, color: "#388e3c" },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    marginVertical: 16,
  },
  historySection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tradeHistoryCard: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 8,
  },
  tradeHistorySymbol: { fontWeight: "600", color: "#333" },
});