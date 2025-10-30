import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import { auth } from "../firebase";

const ENABLE_MOCK_PAYMENTS = true;
const MOCK_PAYMENT_URL = "https://asia-south1-fundexis-app-75223.cloudfunctions.net/mockPaymentCreate";
const getUid = () => auth.currentUser?.uid || null;

// Responsive curve height
const SCREEN_WIDTH = Dimensions.get("window").width;
const HEADER_HEIGHT = 110;

const challenges = [
  {
    id: "1",
    title: "Basic Challenge",
    type: "1L",
    funding: 100000,
    fee: 4000,
    profitTarget: "10%",
    maxLoss: "10%",
    billingKey: "phase1",
  },
  {
    id: "2",
    title: "Standard Challenge",
    type: "5L",
    funding: 500000,
    fee: 15000,
    profitTarget: "10%",
    maxLoss: "10%",
    billingKey: "phase2",
  },
  {
    id: "3",
    title: "Premium Challenge",
    type: "10L",
    funding: 1000000,
    fee: 25000,
    profitTarget: "10%",
    maxLoss: "10%",
    billingKey: "funded",
  },
];

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [loadingId, setLoadingId] = useState(null);
  const [mockLoadingId, setMockLoadingId] = useState(null);

  const handleBuy = (challenge) => {
    setLoadingId(challenge.id);
    navigation.navigate("PaymentOptionsScreen", { challenge });
    setLoadingId(null);
  };

  const handleMockBuy = async (challenge) => {
    setMockLoadingId(challenge.id);
    try {
      const uid = getUid();
      if (!uid) throw new Error("User not authenticated. Please login again.");
      const response = await fetch(MOCK_PAYMENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          challengeTemplateId: challenge.id,
          amount: challenge.fee,
        }),
      });

      if (!response.ok) {
        let errMsg = "Mock payment failed";
        try {
          const errJson = await response.json();
          if (errJson && errJson.error) errMsg += `: ${errJson.error}`;
        } catch (e) {}
        throw new Error(errMsg);
      }

      const result = await response.json();
      const { paymentMockId, challengeCode } = result;
      let canNavigate = false;
      const navState = navigation.getState?.();
      if (navState && navState.routeNames) {
        canNavigate = navState.routeNames.includes("DemoTradingScreen");
      }
      if (!canNavigate) {
        Alert.alert(
          "Navigation Error",
          "DemoTradingScreen is not registered in your navigator. Please add it to your navigation stack in App.js."
        );
        setMockLoadingId(null);
        return;
      }
      navigation.navigate("DemoTradingScreen", {
        challengeCode,
        challengeName: challenge.title,
        challengeFunding: challenge.funding,
        challengeType: challenge.type,
        challengeTarget: challenge.profitTarget,
        challengeMaxLoss: challenge.maxLoss,
        billingKey: challenge.billingKey,
        paymentMockId,
      });
    } catch (err) {
      Alert.alert("Mock payment failed", err.message);
    }
    setMockLoadingId(null);
  };

  const renderChallenge = ({ item }) => (
    <View style={styles.challengeCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="trophy-award" size={30} color={theme.brand} />
        </View>
        <Text style={[styles.challengeTitle, { color: theme.brand }]}>{item.title}</Text>
      </View>
      <View style={styles.challengeMetaRow}>
        <View style={styles.challengeMetaBlock}>
          <Text style={styles.challengeMetaLabel}>Funding</Text>
          <Text style={styles.challengeMetaValue}>{`₹${item.funding.toLocaleString()}`}</Text>
        </View>
        <View style={styles.challengeMetaBlockRight}>
          <Text style={styles.challengeMetaLabel}>Fee</Text>
          <Text style={styles.challengeMetaValue}>{`₹${item.fee.toLocaleString()}`}</Text>
        </View>
      </View>
      <View style={styles.challengeStatsRow}>
        <View style={styles.statsWrapper}>
          <View style={[styles.statPill, { backgroundColor: "#E8FFF2" }]}>
            <Text style={[styles.statsNumber, { color: "#388e3c" }]}>{item.profitTarget}</Text>
            <Text style={[styles.statsLabel, { color: "#388e3c" }]}>Profit Target</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: "#FFE9EA" }]}>
            <Text style={[styles.statsNumber, { color: "#e53935" }]}>{item.maxLoss}</Text>
            <Text style={[styles.statsLabel, { color: "#e53935" }]}>Max Loss</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.brand, marginTop: 16, marginBottom: ENABLE_MOCK_PAYMENTS ? 8 : 0 }]}
        onPress={() => handleBuy(item)}
        disabled={loadingId === item.id}
        activeOpacity={0.85}
      >
        {loadingId === item.id ? (
          <ActivityIndicator color={theme.white} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.white }]}>Buy Challenge</Text>
        )}
      </TouchableOpacity>
      {ENABLE_MOCK_PAYMENTS && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#6B8CFF", opacity: mockLoadingId === item.id ? 0.7 : 1 }]}
          onPress={() => handleMockBuy(item)}
          disabled={mockLoadingId === item.id}
          activeOpacity={0.85}
        >
          {mockLoadingId === item.id ? (
            <ActivityIndicator color={theme.white} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.white }]}>Buy (Mock Payment)</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.headerCurve}>
        <View style={styles.headerCurveBg} />
        <Text style={styles.headerTitle}>Available Challenges</Text>
        <Text style={styles.headerSubtitle}>Choose a challenge that fits your goals</Text>
      </View>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={{ paddingBottom: 30, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  headerCurve: {
    width: "100%",
    height: HEADER_HEIGHT + 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    position: "relative",
    overflow: "hidden",
  },
  headerCurveBg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: HEADER_HEIGHT + 40,
    backgroundColor: "#2540F6",
    borderBottomLeftRadius: 42,
    borderBottomRightRadius: 42,
    zIndex: 1,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 40,
    letterSpacing: 0.2,
    zIndex: 2,
    textAlign: "center",
  },
  headerSubtitle: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.89,
    marginTop: 7,
    marginBottom: 6,
    fontWeight: "500",
    zIndex: 2,
    textAlign: "center",
    letterSpacing: 0.01,
  },
  challengeCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginHorizontal: 18,
    marginBottom: 22,
    padding: 18,
    elevation: 6,
    shadowColor: "#120FD822",
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    borderWidth: 2.5,
    borderColor: "#1740FF", // more visible border
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
    elevation: 2,
    shadowColor: "#2540F6",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
  },
  challengeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    letterSpacing: 0.4,
    marginTop: 2,
  },
  challengeMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    marginTop: 4,
  },
  challengeMetaBlock: {
    flex: 1,
    alignItems: "flex-start",
  },
  challengeMetaBlockRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  challengeMetaLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#888",
    opacity: 0.93,
    marginBottom: 3,
  },
  challengeMetaValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111", // black color for funding and fee
    opacity: 1,
  },
  challengeStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    marginBottom: 2,
    width: "100%",
    justifyContent: "center",
  },
  statsWrapper: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: 18,
  },
  statPill: {
    borderRadius: 13,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    minWidth: 110,
    justifyContent: "center",
    flex: 1,
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 1,
    letterSpacing: 0.2,
  },
  statsLabel: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 1,
    letterSpacing: 0.1,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 0,
    marginBottom: 0,
    width: "100%",
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});