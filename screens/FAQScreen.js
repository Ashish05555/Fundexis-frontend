import React from "react";
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
          <Ionicons name="arrow-back" size={28} color={theme.brand} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerText,
            {
              color: theme.brand,
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
        {/* REMOVE the duplicate header from here */}
        {faqs.map((faq, idx) => (
          <View
            key={idx}
            style={[
              styles.faqItem,
              {
                backgroundColor: theme.card,
                shadowColor: isDark ? theme.brand : "#2540F6",
                borderColor: isDark ? "#2a2a2a" : "#eee",
                borderWidth: isDark ? 1 : 0,
              }
            ]}
          >
            <Text style={[styles.question, { color: theme.brand }]}>{idx + 1}. {faq.question}</Text>
            <Text style={[styles.answer, { color: theme.text }]}>{faq.answer}</Text>
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
  },
  faqItem: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  question: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  answer: {
    fontSize: 15,
    lineHeight: 22,
  },
});