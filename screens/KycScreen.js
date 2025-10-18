import React, { useState, useLayoutEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function KycScreen({ navigation }) {
  const { theme } = useTheme();
  const [pan, setPan] = useState("");
  const [consent, setConsent] = useState(false);
  const [kycStatus, setKycStatus] = useState("not_started");
  const [kycMessage, setKycMessage] = useState("");
  const [kycName, setKycName] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerLeft: () => null,
      headerBackVisible: false,
    });
  }, [navigation]);

  const handleKycSubmit = async () => {
    setKycMessage("");
    setKycName("");
    setLoading(true);
    setKycStatus("pending");

    try {
      const res = await fetch("http://localhost:9000/api/kyc/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan, consent: consent ? "y" : "n" }),
      });
      const data = await res.json();
      if (data.verification === "SUCCESS") {
        setKycStatus("verified");
        setKycName(data.data?.full_name || "");
        setKycMessage(data.message || "KYC verified!");
      } else {
        setKycStatus("rejected");
        setKycMessage(data.message || data.error || "KYC failed.");
      }
    } catch (e) {
      setKycStatus("rejected");
      setKycMessage("Network or server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.outer, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          {navigation && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={theme.brand} />
            </TouchableOpacity>
          )}
          <Text style={[styles.heading, { color: theme.brand }]}>KYC Verification</Text>
        </View>
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
          {kycStatus === "verified" && !!kycName && (
            <Text style={{ color: "#22b573", marginBottom: 6 }}>Verified Name: {kycName}</Text>
          )}
          {!!kycMessage && (
            <Text style={{ color: kycStatus === "verified" ? "#22b573" : theme.error, marginBottom: 8 }}>
              {kycMessage}
            </Text>
          )}
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
            style={styles.consentRow}
            onPress={() => setConsent(val => !val)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, consent && { backgroundColor: theme.brand }]}>
              {consent && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ color: theme.text, marginLeft: 8, fontSize: 15 }}>
              I give my consent to verify my PAN for KYC
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.brand, opacity: consent && pan ? 1 : 0.6 }]}
            onPress={handleKycSubmit}
            disabled={loading || !pan || !consent}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit KYC</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "flex-start" },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 30, marginBottom: 20, paddingHorizontal: 14 },
  backBtn: { padding: 10, borderRadius: 20, marginRight: 2 },
  heading: { fontSize: 22, fontWeight: "700", marginLeft: 8 },
  card: { borderRadius: 18, marginHorizontal: 18, paddingHorizontal: 20, paddingVertical: 25, elevation: 5, alignItems: "center" },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 14, letterSpacing: 0.2, alignSelf: "flex-start" },
  statusText: { fontSize: 14, alignSelf: "flex-start", marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 11, padding: 13, width: "100%", marginBottom: 16, fontSize: 16 },
  consentRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, alignSelf: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#888", justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  submitBtn: { borderRadius: 13, marginTop: 6, width: "100%", paddingVertical: 15, alignItems: "center", elevation: 2 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.2 },
});