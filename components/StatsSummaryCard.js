import React, { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";

// Formats with 2 decimals, no currency symbol
const format2 = (val) => {
  const num = typeof val === "number" ? val : Number(val || 0);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function StatsSummaryCard({ onPress }) {
  const { theme } = useTheme();
  const {
    demoAccounts,
    fundedAccounts,
    fetchDemoAccounts,
    fetchFundedAccounts,
  } = useChallenge();

  // Ensure accounts are fetched
  useEffect(() => {
    if (fetchDemoAccounts) fetchDemoAccounts();
    if (fetchFundedAccounts) fetchFundedAccounts();
  }, []);

  // Combine all accounts and compute total P&L = sum(balance - phaseStartBalance)
  const { hasAny, totalPnl } = useMemo(() => {
    const all = [
      ...(Array.isArray(demoAccounts) ? demoAccounts : []),
      ...(Array.isArray(fundedAccounts) ? fundedAccounts : []),
    ];
    const total = all.reduce((sum, acc) => {
      const bal = Number(acc?.balance ?? 0);
      const start = Number(acc?.phaseStartBalance ?? 0);
      return sum + (bal - start);
    }, 0);
    return { hasAny: all.length > 0, totalPnl: total };
  }, [demoAccounts, fundedAccounts]);

  const pnlColor =
    totalPnl > 0 ? "#388e3c" : totalPnl < 0 ? "#e53935" : theme.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="stats-chart" size={24} color={theme.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.white }]}>Your Statistics</Text>
        {!hasAny ? (
          <Text style={[styles.subtitle, { color: theme.white + "CC" }]}>
            Buy a challenge to track trading progress
          </Text>
        ) : (
          <Text style={[styles.subtitle]}>
            <Text style={{ color: theme.white + "CC" }}>Combined P&L: </Text>
            <Text style={{ color: pnlColor, fontWeight: "800" }}>
              {format2(totalPnl)}
            </Text>
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",

    // gradient-like look using layered views is complex here; keep simple solid brand bg
    backgroundColor: "#1c38d4",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});