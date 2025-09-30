import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, collection, getDocs, onSnapshot } from "firebase/firestore";
import { auth } from "../firebase";
import { useTheme } from "../context/ThemeContext";

export default function PayoutScreen({ navigation }) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [eligibleChallenges, setEligibleChallenges] = useState([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState(null);

  // Real-time states for trade logic
  const [hasActiveTrades, setHasActiveTrades] = useState(false);
  const [closedProfit, setClosedProfit] = useState(0);

  useEffect(() => {
    fetchChallenges();
    fetchPayoutHistory();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    // Real-time trade listener for selected challenge/account
    if (!selectedChallengeId) {
      setHasActiveTrades(false);
      setClosedProfit(0);
      return;
    }
    const currUser = auth.currentUser;
    if (!currUser) return;
    const firestore = getFirestore();
    const tradesRef = collection(
      firestore,
      "users",
      currUser.uid,
      "challenges",
      selectedChallengeId,
      "trades"
    );
    const unsub = onSnapshot(tradesRef, (tradesSnap) => {
      const trades = tradesSnap.docs.map(doc => doc.data());
      const active = trades.some(trade => trade.status === "ACTIVE");
      setHasActiveTrades(active);
      const closedTrades = trades.filter(trade =>
        trade.status === "COMPLETED" || trade.status === "CLOSED"
      );
      const profitSum = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      setClosedProfit(profitSum);
    });
    return () => unsub();
  }, [selectedChallengeId]);

  const fetchChallenges = async () => {
    setChallengeLoading(true);
    try {
      const currUser = auth.currentUser;
      if (!currUser) throw new Error("Not logged in");
      const firestore = getFirestore();
      const challengesRef = collection(
        firestore,
        "users",
        currUser.uid,
        "challenges"
      );
      const snapshot = await getDocs(challengesRef);
      const allChallenges = [];
      snapshot.forEach((doc) => {
        allChallenges.push({ id: doc.id, ...doc.data() });
      });
      // Only funded accounts, both phases complete, positive profit, can add KYC/bank verification checks here if needed
      const eligible = allChallenges.filter(
        (c) =>
          c.phase1 === true &&
          c.phase2 === true &&
          c.funded === true &&
          typeof c.initialAmount === "number" &&
          typeof c.currentBalance === "number" &&
          c.currentBalance > c.initialAmount
          // add c.kycVerified === true && c.bankVerified === true if those fields exist
      );
      setChallenges(allChallenges);
      setEligibleChallenges(eligible);
      if (eligible.length > 0) setSelectedChallengeId(eligible[0].id);
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to fetch challenges");
    }
    setChallengeLoading(false);
  };

  const fetchPayoutHistory = async () => {
    setHistoryLoading(true);
    try {
      const user = auth.currentUser;
      const response = await fetch(
        `https://your-backend-domain.com/api/payouts/history?userId=${user.uid}`
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setPayoutHistory(Array.isArray(data.history) ? data.history : []);
      } else {
        setPayoutHistory([]);
      }
    } catch (err) {
      setPayoutHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const selectedChallenge =
    eligibleChallenges.find((c) => c.id === selectedChallengeId) || null;

  // Only show closedProfit as profit
  const profit = closedProfit;
  const userReceives = Math.floor(profit * 0.9);

  const handleRequestPayout = async () => {
    if (!selectedChallenge || hasActiveTrades) return;
    setLoading(true);
    try {
      const currUser = auth.currentUser;
      const response = await fetch("https://your-backend-domain.com/api/payouts/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: currUser.uid,
          challengeId: selectedChallenge.id,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        Alert.alert(
          "Success",
          "Your request has been submitted. The amount will be credited to your bank account within 5-7 working days."
        );
        fetchChallenges();
        fetchPayoutHistory();
      } else {
        Alert.alert("Error", data.error || "Failed to request payout.");
      }
    } catch (err) {
      Alert.alert("Error", "Network error. Please try again!");
    } finally {
      setLoading(false);
    }
  };

  const renderPayoutItem = ({ item }) => (
    <View style={[styles.payoutItem, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.payoutAmount, { color: theme.brand }]}>₹{item.amount}</Text>
        <Text style={[styles.payoutDate, { color: theme.textSecondary }]}>
          {item.date
            ? new Date(item.date).toLocaleDateString()
            : ""}
        </Text>
      </View>
      <View
        style={[
          styles.payoutStatusPill,
          item.status === "pending"
            ? { backgroundColor: "#FFF6E5" }
            : item.status === "completed"
            ? { backgroundColor: "#E5FFE5" }
            : { backgroundColor: "#FFE5E5" },
        ]}
      >
        <Text
          style={[
            styles.payoutStatusText,
            item.status === "pending"
              ? { color: "#FFB300" }
              : item.status === "completed"
              ? { color: "#33B249" }
              : { color: theme.error },
          ]}
        >
          {item.status
            ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
            : ""}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.brand} />
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.brand }]}>Payout</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Challenge selection and payout info */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.brand + "22" }]}>
          <Text style={[styles.sectionHeader, { color: theme.sectionTitle } ]}>Select Challenge</Text>
          {challengeLoading ? (
            <ActivityIndicator color={theme.brand} style={{ marginTop: 20 }} />
          ) : eligibleChallenges.length === 0 ? (
            <View>
              <Text style={[styles.notEligibleText, { color: theme.brand } ]}>
                You are not eligible for payout yet.
              </Text>
              <Text style={[styles.whyText, { color: theme.textSecondary }]}>
                To be eligible, you must complete KYC, verify your bank account,
                pass both phases, and generate profit on a funded account.
              </Text>
            </View>
          ) : (
            <>
              {eligibleChallenges.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.challengeOption,
                    { backgroundColor: theme.background, borderColor: theme.background },
                    selectedChallengeId === c.id && { borderColor: theme.brand, backgroundColor: theme.brand + "22" },
                  ]}
                  onPress={() => setSelectedChallengeId(c.id)}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={[styles.challengeName, { color: theme.sectionTitle } ]}>
                      {c.name || `Challenge ${c.id.slice(0, 6)}`}
                    </Text>
                    <Text style={[styles.challengeSub, { color: theme.textSecondary }]}>
                      Profit: ₹{selectedChallengeId === c.id ? closedProfit : c.currentBalance - c.initialAmount}
                      {selectedChallengeId === c.id && hasActiveTrades ? " (Close all trades to request payout)" : ""}
                    </Text>
                  </View>
                  {selectedChallengeId === c.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={theme.brand}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {selectedChallenge && (
                <View style={[styles.payoutDetails, { backgroundColor: theme.background }]}>
                  <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>
                    Total Profit:{" "}
                    <Text style={[styles.detailValue, { color: theme.brand } ]}>₹{closedProfit}</Text>
                  </Text>
                  <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>
                    You will receive:{" "}
                    <Text style={styles.detailValueGreen}>₹{userReceives}</Text>{" "}
                    <Text style={{ color: theme.textSecondary }}>(90% of profit)</Text>
                  </Text>
                  {hasActiveTrades && (
                    <Text style={{ color: "#e53935", marginTop: 9, fontWeight: "bold" }}>
                      Please close all active trades before requesting payout.
                    </Text>
                  )}
                  <Text style={{ color: theme.textSecondary, marginTop: 6 }}>
                    (Payout will be sent to your verified bank account.)
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.payoutBtn,
                  { backgroundColor: theme.brand, shadowColor: theme.brand + "22" },
                  (loading || hasActiveTrades) && { opacity: 0.6 },
                ]}
                onPress={handleRequestPayout}
                disabled={loading || hasActiveTrades}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {hasActiveTrades
                      ? "Close all trades to request payout"
                      : "Request Payout"}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* History Title */}
        <Text style={[styles.historyTitle, { color: theme.brand }]}>Payout History</Text>

        {/* Payout History List */}
        {historyLoading ? (
          <ActivityIndicator
            size="large"
            color={theme.brand}
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={payoutHistory}
            keyExtractor={(item, idx) =>
              item.id ? item.id.toString() : idx.toString()
            }
            renderItem={renderPayoutItem}
            ListEmptyComponent={
              <Text
                style={{
                  color: theme.textSecondary,
                  padding: 20,
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                No payouts found.
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 30 }}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 0 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "android" ? 24 : 48,
    paddingBottom: 10,
    paddingHorizontal: 6,
    elevation: 4,
    marginBottom: 12,
  },
  backBtn: {
    padding: 10,
    borderRadius: 20,
    marginRight: 2,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 8,
    flex: 1,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    elevation: 1,
    marginHorizontal: 12,
  },
  notEligibleText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 7,
  },
  whyText: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 19,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  challengeOption: {
    borderRadius: 10,
    padding: 13,
    marginVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
  },
  challengeOptionSelected: {},
  challengeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  challengeSub: {
    fontSize: 13,
    marginTop: 1,
  },
  payoutDetails: {
    marginTop: 14,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 3,
  },
  detailValue: {
    fontWeight: "700",
    fontSize: 16,
  },
  detailValueGreen: {
    color: "#22b573",
    fontWeight: "700",
    fontSize: 16,
  },
  payoutBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    marginBottom: 8,
    marginTop: 18,
    elevation: 6,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 12,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 13,
    marginLeft: 22,
    marginTop: 1,
    textAlign: "left",
  },
  payoutItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    marginHorizontal: 18,
    marginVertical: 6,
    paddingVertical: 16,
    paddingHorizontal: 15,
    elevation: 2,
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  payoutAmount: {
    fontWeight: "700",
    fontSize: 17,
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: 13,
    marginTop: 1,
  },
  payoutStatusPill: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
    marginLeft: 14,
  },
  payoutStatusText: {
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
    letterSpacing: 0.1,
    textTransform: "capitalize",
  },
});