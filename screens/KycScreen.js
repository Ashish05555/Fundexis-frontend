import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function KycScreen({ navigation }) {
  const { theme } = useTheme();
  const [pan, setPan] = useState("");
  const [kycName, setKycName] = useState("");
  const [consent, setConsent] = useState(false);
  const [kycStatus, setKycStatus] = useState("not_started");
  const [kycMessage, setKycMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerLeft: () => null,
      headerBackVisible: false,
    });
  }, [navigation]);

  const validatePAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  const handleKycSubmit = async () => {
    setKycMessage("");
    setLoading(true);
    setKycStatus("pending");

    try {
      const res = await fetch("http://localhost:9000/api/kyc/verify-pan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pan, full_name: kycName, consent: consent ? "y" : "n" }),
      });
      const data = await res.json();
      if (data.verification === "SUCCESS") {
        setKycStatus("verified");
        setKycName(data.data?.full_name || kycName);
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

          {/* Form - Name and PAN vertical order */}
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>Full Name <Text style={{ color: "#f44336" }}>*</Text></Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Enter your full name"
                value={kycName}
                onChangeText={setKycName}
                autoCapitalize="words"
                placeholderTextColor={theme.textSecondary}
                maxLength={60}
              />
              <Text style={styles.formSubLabel}>As per your PAN card</Text>
            </View>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>PAN Number <Text style={{ color: "#f44336" }}>*</Text></Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="ENTER PAN (E.G., ABCDE1234F)"
                value={pan}
                onChangeText={setPan}
                autoCapitalize="characters"
                placeholderTextColor={theme.textSecondary}
                maxLength={10}
              />
              <Text style={styles.formSubLabel}>10-digit alphanumeric code</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setConsent(val => !val)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, consent && { backgroundColor: theme.brand }]}>
              {consent && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ color: theme.text, marginLeft: 8, fontSize: 15 }}>
              I give my consent to verify my PAN for KYC purposes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.brand, opacity: consent && validatePAN(pan) && !!kycName ? 1 : 0.6 }]}
            onPress={handleKycSubmit}
            disabled={loading || !validatePAN(pan) || !consent || !kycName}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit KYC</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.infoText}>Your information is encrypted and securely stored</Text>
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
  card: { borderRadius: 18, marginHorizontal: 18, paddingHorizontal: 20, paddingVertical: 25, elevation: 5, alignItems: "stretch" },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 14, letterSpacing: 0.2, alignSelf: "flex-start" },
  statusText: { fontSize: 14, alignSelf: "flex-start", marginBottom: 10 },
  formRow: { flexDirection: "column", gap: 12, marginBottom: 10 },
  formCol: { width: "100%" },
  formLabel: { fontSize: 16, fontWeight: "700", marginBottom: 7, color: "#232323" },
  formSubLabel: { fontSize: 12, color: "#888", marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: 11, padding: 13, width: "100%", marginBottom: 6, fontSize: 16 },
  consentRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, alignSelf: "flex-start" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#888", justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  submitBtn: { borderRadius: 13, marginTop: 10, width: "100%", paddingVertical: 15, alignItems: "center", elevation: 2 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 17, letterSpacing: 0.2 },
  infoText: { color: "#888", fontSize: 13, marginTop: 14, textAlign: "center" },
});