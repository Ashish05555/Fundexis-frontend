import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useNavigation } from "@react-navigation/native";

const BRAND_GRADIENT = ["#2540F6", "#120FD8"];
const ICON_GRADIENT = ["#2540F6", "#6B8CFF"];

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

  const handleBuy = (challenge) => {
    setLoadingId(challenge.id);
    // Navigate to Payment Options screen, passing the selected challenge
    navigation.navigate("PaymentOptionsScreen", { challenge });
    setLoadingId(null);
  };

  const renderChallenge = ({ item }) => (
    <ExpoLinearGradient
      colors={BRAND_GRADIENT}
      style={styles.cardWrapper}
      start={[0, 0]}
      end={[1, 1]}
    >
      <View style={[styles.cardContent, { backgroundColor: theme.card }]}>
        <ExpoLinearGradient colors={ICON_GRADIENT} style={styles.iconCircle}>
          <MaterialCommunityIcons name="trophy-award" size={32} color={theme.white} />
        </ExpoLinearGradient>
        <View style={styles.cardInfo}>
          <Text style={[styles.challengeName, { color: theme.brand }]}>{item.title}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.text }]}>Funding</Text>
            <Text style={[styles.value, { color: theme.brand }]}>₹{item.funding.toLocaleString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.text }]}>Fee</Text>
            <Text style={[styles.value, { color: theme.brand }]}>₹{item.fee.toLocaleString()}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statPill, { backgroundColor: theme.background }]}>
              <Text style={[styles.statsNumber, { color: theme.brand }]}>{item.profitTarget}</Text>
              <Text style={[styles.statsLabel, { color: theme.sectionTitle }]}>Profit Target</Text>
            </View>
            <View style={[styles.statPill, { backgroundColor: theme.background }]}>
              <Text style={[styles.statsNumber, { color: theme.brand }]}>{item.maxLoss}</Text>
              <Text style={[styles.statsLabel, { color: theme.sectionTitle }]}>Max Loss</Text>
            </View>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: theme.brand, opacity: loadingId === item.id ? 0.7 : 1 },
        ]}
        onPress={() => handleBuy(item)}
        disabled={loadingId === item.id}
      >
        {loadingId === item.id ? (
          <ActivityIndicator color={theme.white} />
        ) : (
          <Text style={[styles.buttonText, { color: theme.white }]}>Buy Challenge</Text>
        )}
      </TouchableOpacity>
    </ExpoLinearGradient>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.headerCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.header, { color: theme.brand }]}>Available Challenges</Text>
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
  headerCard: {
    width: "100%",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 6,
    shadowColor: "#120FD822",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 18,
    marginBottom: 16,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: "center",
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 0.4,
  },
  cardWrapper: {
    borderRadius: 22,
    marginHorizontal: 18,
    marginBottom: 22,
    padding: 2,
    elevation: 8,
    shadowColor: "#120FD822",
    shadowOpacity: 0.17,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 18,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
    elevation: 2,
    shadowColor: "#2540F6",
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
  },
  cardInfo: {
    flex: 1,
    justifyContent: "center",
  },
  challengeName: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "left",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    marginTop: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.93,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    opacity: 0.95,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
  },
  statPill: {
    borderRadius: 13,
    paddingVertical: 7,
    paddingHorizontal: 16,
    alignItems: "center",
    minWidth: 70,
    marginRight: 6,
  },
  statsNumber: {
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 1,
  },
  statsLabel: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 1,
  },
  button: {
    paddingVertical: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: "center",
    marginTop: 0,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});