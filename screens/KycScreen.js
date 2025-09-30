import React, { useState, useLayoutEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function KycScreen({ navigation }) {
  const { theme } = useTheme();
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [kycStatus, setKycStatus] = useState("not_started");

  // Remove the navigation header's default back arrow (keep header/title unchanged)
  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerLeft: () => null,
      headerBackVisible: false,
    });
  }, [navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.outer, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          {navigation && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={theme.brand} />
            </TouchableOpacity>
          )}
          <Text style={[styles.heading, { color: theme.brand }]}>KYC Verification</Text>
        </View>

        {/* KYC Card */}
        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
          <Text style={[styles.cardTitle, { color: theme.brand }]}>Enter your KYC Details</Text>
          <Text style={[styles.statusText, { color: theme.text }]}>
            KYC Status:{" "}
            <Text style={[
              kycStatus === "verified" && { color: "#22b573", fontWeight: "700" },
              kycStatus === "pending" && { color: "#f39c12", fontWeight: "700" },
              kycStatus === "rejected" && { color: theme.error, fontWeight: "700" },
              kycStatus === "not_started" && { color: theme.textSecondary, fontWeight: "700" },
            ]}>
              {kycStatus.replace("_", " ")}
            </Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="Aadhaar Number"
            value={aadhaar}
            onChangeText={setAadhaar}
            keyboardType="number-pad"
            placeholderTextColor={theme.textSecondary}
            maxLength={12}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="PAN Number"
            value={pan}
            onChangeText={setPan}
            autoCapitalize="characters"
            placeholderTextColor={theme.textSecondary}
            maxLength={10}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.brand }]}
            onPress={() => setKycStatus("pending")}
          >
            <Text style={styles.submitBtnText}>Submit KYC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "flex-start",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 14,
  },
  backBtn: {
    padding: 10,
    borderRadius: 20,
    marginRight: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    marginLeft: 8,
  },
  card: {
    borderRadius: 18,
    marginHorizontal: 18,
    paddingHorizontal: 20,
    paddingVertical: 25,
    elevation: 5,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 14,
    letterSpacing: 0.2,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 14,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 13,
    width: "100%",
    marginBottom: 16,
    fontSize: 16,
  },
  submitBtn: {
    borderRadius: 13,
    marginTop: 6,
    width: "100%",
    paddingVertical: 15,
    alignItems: "center",
    elevation: 2,
  },
  submitBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 17,
    letterSpacing: 0.2,
  },
});