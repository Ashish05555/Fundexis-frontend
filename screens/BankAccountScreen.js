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

export default function BankAccountScreen({ navigation }) {
  const { theme } = useTheme();
  const [bankAccount, setBankAccount] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [consent, setConsent] = useState(false);
  const [bankStatus, setBankStatus] = useState("not_started");
  const [bankMessage, setBankMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerLeft: () => null,
      headerBackVisible: false,
    });
  }, [navigation]);

  const validateIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
  const validateAccount = (acc) => acc.length >= 6;

  const handleBankSubmit = async () => {
    setBankStatus("pending");
    setBankMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:9000/api/kyc/verify-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountNumber: bankAccount, ifsc }),
      });
      const data = await res.json();
      if (data.status === "pending" || data.status === "success") {
        setBankStatus("pending");
        setBankMessage("Bank verification in progress. Please check back in 24 hours.");
      } else {
        setBankStatus("rejected");
        setBankMessage(data.message || data.error || "Bank verification failed.");
      }
    } catch (e) {
      setBankStatus("rejected");
      setBankMessage("Network or server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[bankStyles.outer, { backgroundColor: "#f8f9fc" }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={bankStyles.container} keyboardShouldPersistTaps="handled">
        <View style={bankStyles.screenCenter}>
          <View style={bankStyles.headerRow}>
            <TouchableOpacity style={bankStyles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={theme.brand} />
            </TouchableOpacity>
            <Text style={[bankStyles.heading, { color: theme.brand }]}>Bank Verification</Text>
          </View>
          <View style={[bankStyles.card, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
            <Text style={[bankStyles.cardTitle, { color: theme.brand }]}>Enter your Bank Details</Text>
            <Text style={bankStyles.cardSubTitle}>Add your bank account for seamless transactions</Text>
            <Text style={[bankStyles.statusText, { color: theme.text }]}>
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
            {!!bankMessage && (
              <Text style={{ color: bankStatus === "verified" ? "#22b573" : theme.error, marginBottom: 8 }}>
                {bankMessage}
              </Text>
            )}
            {/* Form - Bank Account and IFSC vertical order */}
            <View style={bankStyles.formRow}>
              <View style={bankStyles.formCol}>
                <Text style={bankStyles.formLabel}>Bank Account Number <Text style={{ color: "#f44336" }}>*</Text></Text>
                <TextInput
                  style={[bankStyles.input, { backgroundColor: theme.background, borderColor: theme.border, color: "#232323" }]}
                  placeholder="Enter account number"
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  keyboardType="number-pad"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={18}
                />
                <Text style={bankStyles.formSubLabel}>Your bank account number</Text>
              </View>
              <View style={bankStyles.formCol}>
                <Text style={bankStyles.formLabel}>IFSC Code <Text style={{ color: "#f44336" }}>*</Text></Text>
                <TextInput
                  style={[bankStyles.input, { backgroundColor: theme.background, borderColor: theme.border, color: "#232323" }]}
                  placeholder="ENTER IFSC (E.G., SBIN0001234)"
                  value={ifsc}
                  onChangeText={setIfsc}
                  autoCapitalize="characters"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={11}
                />
                <Text style={bankStyles.formSubLabel}>11-character bank code</Text>
              </View>
            </View>
            <TouchableOpacity
              style={bankStyles.consentRow}
              onPress={() => setConsent(val => !val)}
              activeOpacity={0.7}
            >
              <View style={[bankStyles.checkbox, consent && { backgroundColor: theme.brand }]}>
                {consent && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <Text style={{ color: theme.text, marginLeft: 8, fontSize: 15 }}>
                I authorize verification of my bank account details and consent to penny drop verification
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bankStyles.submitBtn, { backgroundColor: theme.brand, opacity: consent && validateAccount(bankAccount) && validateIFSC(ifsc) ? 1 : 0.6 }]}
              onPress={handleBankSubmit}
              disabled={loading || !validateAccount(bankAccount) || !validateIFSC(ifsc) || !consent}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={bankStyles.submitBtnText}>Submit Bank Details</Text>
              )}
            </TouchableOpacity>
            <Text style={bankStyles.infoText}>Your bank details are encrypted and securely stored</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const bankStyles = StyleSheet.create({
  outer: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "flex-start", alignItems: "center" },
  screenCenter: { width: "100%", maxWidth: 430, marginTop: 0, marginBottom: 30, alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 30, marginBottom: 20, paddingHorizontal: 14, justifyContent: "flex-start" },
  backBtn: { padding: 10, borderRadius: 20, marginRight: 2 },
  heading: { fontSize: 22, fontWeight: "700", marginLeft: 8 },
  card: { borderRadius: 18, marginHorizontal: 18, paddingHorizontal: 20, paddingVertical: 25, elevation: 5, alignItems: "stretch" },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 14, letterSpacing: 0.2, alignSelf: "flex-start" },
  cardSubTitle: { fontSize: 13.5, color: "#888", marginBottom: 18, alignSelf: "flex-start" },
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