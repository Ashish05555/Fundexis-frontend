import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const THEME = {
  background: "#fff",
  card: "#f4f7ff",
  text: "#232323",
  muted: "#888",
  brand: "#2540F6",
  accent: "#1ed760",
  razorpay: "#2540F6",
  googlePlay: "#2540F6",
};

export default function PaymentOptionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { challenge } = route.params;

  const [selected, setSelected] = useState("razorpay");

  const paymentMethods = [
    {
      key: "razorpay",
      label: "Razorpay",
      icon: (
        <MaterialCommunityIcons name="bank" size={32} color={THEME.razorpay} />
      ),
      button: "Continue with Razorpay",
      color: THEME.razorpay,
    },
    {
      key: "google",
      label: "Google Play",
      icon: (
        <MaterialCommunityIcons name="google-play" size={32} color={"#4285F4"} />
      ),
      button: "Continue with Google Play",
      color: THEME.googlePlay,
    },
  ];

  const handleContinue = () => {
    if (selected === "razorpay") {
      navigation.navigate("RazorpayScreen", { challenge });
    } else {
      navigation.navigate("GooglePlayScreen", { challenge });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: THEME.background }}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.challengeCard}>
        <MaterialCommunityIcons name="trophy-award" size={38} color={THEME.brand} style={{ marginRight: 14 }} />
        <View>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeSubtitle}>
            Funding: <Text style={{ color: THEME.text, fontWeight: "bold" }}>₹{challenge.funding.toLocaleString()}</Text>
          </Text>
          <Text style={styles.challengeSubtitle}>
            Fee: <Text style={{ color: THEME.text, fontWeight: "bold" }}>₹{challenge.fee.toLocaleString()}</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Choose how to pay</Text>
      <Text style={styles.sectionSubtitle}>
        You can pay directly through Razorpay or using your Google Play account.
      </Text>

      <View style={styles.optionsRow}>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.key}
            style={[
              styles.methodCard,
              {
                borderColor: selected === method.key ? THEME.brand : "#e0e0e0",
                backgroundColor: selected === method.key ? "#f7faff" : THEME.card,
              },
            ]}
            onPress={() => setSelected(method.key)}
            activeOpacity={0.85}
          >
            {method.icon}
            <Text
              style={[
                styles.methodLabel,
                { color: selected === method.key ? THEME.brand : THEME.text },
              ]}
            >
              {method.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.continueBtn,
          { backgroundColor: THEME.brand }
        ]}
        onPress={handleContinue}
      >
        <Text style={styles.continueBtnText}>
          {paymentMethods.find((m) => m.key === selected).button}
        </Text>
      </TouchableOpacity>

      <View style={styles.legalBox}>
        <Text style={styles.legalText}>
          You'll finish your purchase with{" "}
          <Text style={{ fontWeight: "bold", color: THEME.brand }}>
            {selected === "razorpay" ? "Razorpay" : "Google Play"}
          </Text>
          . Fees and taxes may apply.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 5,
    paddingHorizontal: 3,
    paddingBottom: 7,
    backgroundColor: "#fff",
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eaeaea",
  },
  backBtn: {
    padding: 8,
    marginRight: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#232323",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  challengeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f7ff",
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 7,
    shadowOffset: { width: 1, height: 4 },
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#232323",
    marginBottom: 2,
  },
  challengeSubtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 1,
  },
  sectionTitle: {
    marginLeft: 20,
    marginTop: 18,
    fontSize: 17,
    fontWeight: "bold",
    color: "#232323",
    marginBottom: 2,
  },
  sectionSubtitle: {
    marginLeft: 20,
    fontSize: 13,
    color: "#8a8a8a",
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 18,
    marginTop: 4,
  },
  methodCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 19,
    borderRadius: 15,
    borderWidth: 2.3,
    marginHorizontal: 4,
    backgroundColor: "#f4f7ff",
  },
  methodLabel: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  continueBtn: {
    marginTop: 6,
    marginHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.25,
  },
  legalBox: {
    marginHorizontal: 22,
    paddingHorizontal: 3,
    marginTop: 12,
  },
  legalText: {
    fontSize: 12.2,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
});