import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const faqs = [
  {
    question: "How do I buy a challenge?",
    answer: "Go to the “Buy a Challenge” section, select your preferred challenge, and complete the payment process."
  },
  {
    question: "How does the funding process work?",
    answer: "After you complete a challenge, your account will be reviewed and funded according to the challenge terms."
  },
  {
    question: "How can I track my trading performance?",
    answer: "Your trading statistics are displayed on the Home screen under “Your Statistics”."
  },
  {
    question: "How do I request a payout?",
    answer: "Go to Settings in Profile and click on Payout, then follow the steps. Make sure your bank account is linked, KYC is complete, and you have profit."
  },
  {
    question: "What happens if I lose a challenge?",
    answer: "If you do not meet the challenge requirements, the challenge is marked as failed. You can try again."
  },
  {
    question: "How do I contact support?",
    answer: "Go to “Help & Support” and select “Contact Support”. Email us and we’ll get back to you."
  },
  {
    question: "How is my data protected?",
    answer: "We use secure servers and encryption to protect your personal and trading data."
  },
  {
    question: "What are the trading rules?",
    answer: "You can buy as many challenge accounts as you want. All trades must comply with challenge rules. Cheating leads to suspension."
  },
  {
    question: "Why is my bank/account not linked?",
    answer: "Make sure info is correct and your bank supports our payout system. Contact support if you need help."
  },
  {
    question: "Can I change my registered email?",
    answer: "Yes, go to Settings to update your contact information."
  }
];

export default function FAQScreen() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const navigation = useNavigation();
  const [expandedIndex, setExpandedIndex] = useState(-1);

  return (
    <View
      style={
        Platform.OS === "web"
          ? { backgroundColor: theme.background, height: "100vh" }
          : { backgroundColor: theme.background, flex: 1 }
      }
    >
      {/* Header Bar, styled like KYC screen */}
      <View style={[styles.headerBar, { backgroundColor: theme.background, borderBottomColor: isDark ? "#232323" : "#eee" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
          <Ionicons name="arrow-back" size={28} color="#2540F6" />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerText,
            {
              color: "#2540F6",
              textShadowColor: isDark ? "#222" : "#fff",
            }
          ]}
        >
          FAQ / Help Center
        </Text>
        <View style={{ width: 40 }} /> {/* Spacer to balance header */}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {faqs.map((faq, idx) => (
          <View key={idx} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.questionRow}
              activeOpacity={0.92}
              onPress={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
            >
              <Text style={styles.question}>
                {idx + 1}. {faq.question}
              </Text>
              <Ionicons
                name={expandedIndex === idx ? "chevron-up" : "chevron-down"}
                size={22}
                color="#2540F6"
              />
            </TouchableOpacity>
            {expandedIndex === idx && (
              <View style={styles.answerContainer}>
                <Text style={styles.answer}>{faq.answer}</Text>
              </View>
            )}
          </View>
        ))}
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
  },
  container: {
    padding: 20,
    paddingTop: 10,
    alignItems: "center",
    maxWidth: 500,
    alignSelf: "center"
  },
  faqItem: {
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
  question: {
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
  answer: {
    fontSize: 15,
    lineHeight: 22,
    color: "#181A1B",
    marginTop: 0,
    opacity: 1,
  },
});