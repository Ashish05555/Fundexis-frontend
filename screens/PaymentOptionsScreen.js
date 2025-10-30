import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const THEME = {
  background: "#2540F6",      // Blue header background
  card: "#fff",
  text: "#232323",
  muted: "#888",
  brand: "#2540F6",
  accent: "#1ed760",
  shadow: "#2540F6",
  secure: "#16c784",
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
        <MaterialCommunityIcons name="bank" size={34} color={THEME.brand} />
      ),
      subtitle: "UPI, Cards & More",
      button: "Continue with Razorpay",
      color: THEME.brand,
    },
    {
      key: "google",
      label: "Google Play",
      icon: (
        <MaterialCommunityIcons name="google-play" size={34} color={THEME.brand} />
      ),
      subtitle: "Play balance",
      button: "Continue with Google Play",
      color: THEME.brand,
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
    <SafeAreaView style={styles.safe}>
      {/* Blue header background */}
      <View style={styles.headerBg}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={25} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 25 }} />
        </View>
      </View>

      {/* Main card attached below header */}
      <View style={styles.mainCard}>
        {/* Challenge Card (section) */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeIconWrap}>
            <MaterialCommunityIcons name="star" size={26} color={THEME.brand} />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <View style={styles.challengeRow}>
              <Text style={styles.challengeMeta}>Funding</Text>
              <Text style={styles.challengeAmount}>₹{challenge.funding.toLocaleString()}</Text>
            </View>
            <View style={styles.challengeRow}>
              <Text style={styles.challengeMeta}>Fee</Text>
              <Text style={styles.challengeAmount}>₹{challenge.fee.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Payment Section */}
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
                selected === method.key && styles.methodCardActive,
              ]}
              onPress={() => setSelected(method.key)}
              activeOpacity={0.9}
            >
              <View style={styles.methodIcon}>{method.icon}</View>
              <Text
                style={[
                  styles.methodLabel,
                  selected === method.key && styles.methodLabelActive,
                ]}
              >
                {method.label}
              </Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              {selected === method.key && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={THEME.brand}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Secure Payment Info */}
        <View style={styles.securePaymentRow}>
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color={THEME.secure}
            style={{ marginRight: 7 }}
          />
          <Text style={styles.secureText}>
            Secure Payment. Your payment information is encrypted and secure. We never store your card details.
          </Text>
        </View>

        {/* Continue Button */}
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

        {/* Legal */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            You'll finish your purchase with{" "}
            <Text style={{ fontWeight: "bold", color: THEME.brand }}>
              {selected === "razorpay" ? "Razorpay" : "Google Play"}
            </Text>
            . Fees and taxes may apply.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  headerBg: {
    backgroundColor: THEME.background,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 8,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 9,
    backgroundColor: "transparent",
  },
  backBtn: {
    padding: 7,
    marginRight: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  mainCard: {
    flex: 1,
    backgroundColor: THEME.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 16,
    paddingHorizontal: 0,
    marginTop: -12,
    shadowColor: "#2540F6",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  challengeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f7ff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#dbeafe",
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 8,
    padding: 18,
    shadowColor: "#e3ebff",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  challengeIconWrap: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 10,
    marginRight: 13,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#232323",
    marginBottom: 2,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 1,
  },
  challengeMeta: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
    marginRight: 7,
  },
  challengeAmount: {
    fontSize: 15,
    color: "#232323",
    fontWeight: "700",
  },

  sectionTitle: {
    marginLeft: 20,
    marginTop: 18,
    fontSize: 16,
    fontWeight: "700",
    color: "#232323",
    marginBottom: 3,
  },
  sectionSubtitle: {
    marginLeft: 20,
    fontSize: 13,
    color: "#8a8a8a",
    marginBottom: 12,
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 18,
    marginBottom: 22,
    marginTop: 4,
    gap: 10,
  },
  methodCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#e0e5ef",
    backgroundColor: "#fff",
    marginHorizontal: 2,
    shadowColor: "#e3ebff",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
    position: "relative",
  },
  methodCardActive: {
    borderColor: "#2540F6",
    backgroundColor: "#f7faff",
  },
  methodIcon: {
    marginBottom: 7,
  },
  methodLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#232323",
    marginBottom: 3,
  },
  methodLabelActive: {
    color: "#2540F6",
  },
  methodSubtitle: {
    fontSize: 13,
    color: "#888",
    fontWeight: "500",
    marginBottom: 3,
  },
  checkIcon: {
    position: "absolute",
    bottom: 12,
    right: 12,
  },

  securePaymentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 22,
    marginBottom: 8,
  },
  secureText: {
    fontSize: 12.5,
    color: "#16c784",
    fontWeight: "600",
  },
  continueBtn: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#e3ebff",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  continueBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    letterSpacing: 0.25,
  },
  legalBox: {
    marginHorizontal: 20,
    paddingHorizontal: 3,
    marginTop: 16,
  },
  legalText: {
    fontSize: 12.2,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },
});