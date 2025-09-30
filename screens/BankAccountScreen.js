import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function BankAccountScreen({ navigation }) {
  const { theme } = useTheme();
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankStatus, setBankStatus] = useState("not_started");

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
          <Text style={[styles.heading, { color: theme.brand }]}>Bank Verification</Text>
        </View>

        {/* Bank Card */}
        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
          <Text style={[styles.cardTitle, { color: theme.brand }]}>Enter your Bank Details</Text>
          <Text style={[styles.statusText, { color: theme.text }]}>
            Bank Status:{" "}
            <Text style={[
              bankStatus === "verified" && { color: "#22b573", fontWeight: "700" },
              bankStatus === "pending" && { color: "#f39c12", fontWeight: "700" },
              bankStatus === "rejected" && { color: theme.error, fontWeight: "700" },
              bankStatus === "not_started" && { color: theme.textSecondary, fontWeight: "700" },
            ]}>
              {bankStatus.replace("_", " ")}
            </Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="Bank Account Number"
            value={bankAccount}
            onChangeText={setBankAccount}
            keyboardType="number-pad"
            placeholderTextColor={theme.textSecondary}
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
            placeholder="IFSC Code"
            value={ifsc}
            onChangeText={setIfsc}
            autoCapitalize="characters"
            placeholderTextColor={theme.textSecondary}
          />
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.brand }]}
            onPress={() => setBankStatus("pending")}
          >
            <Text style={styles.submitBtnText}>Submit Bank Details</Text>
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