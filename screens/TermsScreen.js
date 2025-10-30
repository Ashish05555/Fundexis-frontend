import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const sections = [
  {
    header: "Eligibility",
    text:
      "You must be at least 18 years old to use this app and participate in trading challenges. You are responsible for providing accurate information during registration."
  },
  {
    header: "Account Registration",
    text:
      "Each user is allowed only one registered email account. Multiple accounts or fraudulent activity may result in suspension."
  },
  {
    header: "Challenges & Funding",
    text:
      "- The app provides simulated trading challenges.\n- Completion of a challenge is subject to meeting specific profit, loss, and trading criteria, as outlined in the challenge details.\n- Funding is provided only after successful challenge completion and account verification."
  },
  {
    header: "Trading Rules",
    text:
      "- You may purchase and operate multiple challenge accounts.\n- All trades must be made within the app’s platform and comply with challenge rules specified in the app.\n- Cheating, use of bots, or any attempt to manipulate results is strictly prohibited and may result in disqualification or suspension."
  },
  {
    header: "Payouts",
    text:
      "- Payouts are processed according to the app’s schedule and policies.\n- You must link a valid bank account and complete KYC to receive payouts.\n- Only profits earned on funded accounts are eligible for payout.\n- Any fees or taxes applicable to payouts are the user’s responsibility."
  },
  {
    header: "Privacy & Data",
    text:
      "Your personal and trading data are protected according to our Privacy Policy."
  },
  {
    header: "Limitation of Liability",
    text:
      "The app and its owners are not responsible for financial losses, missed opportunities, or data breaches caused by third-party providers or user errors."
  },
  {
    header: "Changes to Terms",
    text:
      "Terms may change from time to time. Users will be notified of significant updates via the app or email."
  },
  {
    header: "Governing Law",
    text:
      "All disputes will be subject to the jurisdiction of the courts of India."
  }
];

export default function TermsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [expandedIndex, setExpandedIndex] = useState(-1);

  return (
    <View
      style={
        Platform.OS === "web"
          ? { backgroundColor: theme.background, minHeight: "100vh" }
          : { backgroundColor: theme.background, flex: 1 }
      }
    >
      <View style={[styles.headerBar, { backgroundColor: theme.background, borderBottomColor: "#eee" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
          <Ionicons name="arrow-back" size={28} color="#2540F6" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, idx) => (
          <View key={idx} style={styles.card}>
            <TouchableOpacity
              style={styles.questionRow}
              activeOpacity={0.92}
              onPress={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
            >
              <Text style={styles.sectionHeader}>
                {idx + 1}. {section.header}
              </Text>
              <Ionicons
                name={expandedIndex === idx ? "chevron-up" : "chevron-down"}
                size={22}
                color="#2540F6"
              />
            </TouchableOpacity>
            {expandedIndex === idx && (
              <View style={styles.answerContainer}>
                <Text style={styles.paragraph}>
                  {section.text.split('\n').map((line, i) => (
                    <Text key={i}>
                      {line}
                      {i < section.text.split('\n').length - 1 ? '\n' : ''}
                    </Text>
                  ))}
                </Text>
              </View>
            )}
          </View>
        ))}
        <Text style={styles.footer}>
          By using this app, you agree to these terms.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === "ios" ? 52 : 24,
    paddingBottom: 15,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    zIndex: 10,
  },
  arrowContainer: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
    color: "#2540F6",
  },
  container: {
    paddingVertical: 20,
    paddingHorizontal: Platform.OS === "web" ? "0.5vw" : 0,
    minWidth: "100%",
    width: "100%",
    alignSelf: "stretch",
  },
  card: {
    marginBottom: 15,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#e3e3e3",
    alignSelf: "stretch",
    width: "100%",
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    width: "100%",
  },
  sectionHeader: {
    fontSize: 16.5,
    fontWeight: "bold",
    color: "#2540F6",
    marginBottom: 2,
    letterSpacing: 0.2,
    flex: 1,
  },
  answerContainer: {
    backgroundColor: "#f2f3f7",
    borderRadius: 8,
    marginTop: 7,
    padding: 10,
    width: "100%",
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: "#181A1B", // darker text for answers!
    opacity: 1,
  },
  footer: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
    opacity: 0.8,
    color: "#232323",
  },
});