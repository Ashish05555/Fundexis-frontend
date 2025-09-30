import React from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import CustomHeader from "../components/CustomHeader";

export default function TermsScreen() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CustomHeader title="Terms & Conditions" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={true}
      >
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>1. Eligibility</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            You must be at least 18 years old to use this app and participate in trading challenges. You are responsible for providing accurate information during registration.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>2. Account Registration</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Each user is allowed only one registered email account. Multiple accounts or fraudulent activity may result in suspension.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>3. Challenges & Funding</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            - The app provides simulated trading challenges.{"\n"}
            - Completion of a challenge is subject to meeting specific profit, loss, and trading criteria, as outlined in the challenge details.{"\n"}
            - Funding is provided only after successful challenge completion and account verification.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>4. Trading Rules</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            - You may purchase and operate multiple challenge accounts.{"\n"}
            - All trades must be made within the app’s platform and comply with challenge rules specified in the app.{"\n"}
            - Cheating, use of bots, or any attempt to manipulate results is strictly prohibited and may result in disqualification or suspension.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>5. Payouts</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            - Payouts are processed according to the app’s schedule and policies.{"\n"}
            - You must link a valid bank account and complete KYC to receive payouts.{"\n"}
            - Only profits earned on funded accounts are eligible for payout.{"\n"}
            - Any fees or taxes applicable to payouts are the user’s responsibility.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>6. Privacy & Data</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Your personal and trading data are protected according to our <Text style={{ color: theme.brand }}>Privacy Policy</Text>.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>7. Limitation of Liability</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            The app and its owners are not responsible for financial losses, missed opportunities, or data breaches caused by third-party providers or user errors.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>8. Changes to Terms</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            Terms may change from time to time. Users will be notified of significant updates via the app or email.
          </Text>
        </View>
        <View style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: isDark ? "#2a2a2a" : "#eee",
            borderWidth: isDark ? 1 : 0,
          }
        ]}>
          <Text style={[styles.sectionHeader, { color: theme.brand }]}>9. Governing Law</Text>
          <Text style={[styles.paragraph, { color: theme.text }]}>
            All disputes will be subject to the jurisdiction of the courts of India.
          </Text>
        </View>
        <Text style={[styles.footer, { color: theme.text }]}>
          By using this app, you agree to these terms.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
    opacity: 0.8,
  },
});