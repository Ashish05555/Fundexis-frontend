import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const sections = [
  {
    header: "Information We Collect",
    text:
      "- Personal identification: Name, email, bank information, KYC documents.\n- Trading activity: Statistics, challenge participation, payouts."
  },
  {
    header: "How We Use Your Information",
    text:
      "- To provide app features, process challenges, and facilitate payouts.\n- For account verification, KYC compliance, and security.\n- For analytics and app improvements."
  },
  {
    header: "Data Protection",
    text:
      "- Data is stored on secure, encrypted servers.\n- Only authorized personnel can access sensitive data.\n- We regularly review security practices to protect user data."
  },
  {
    header: "Sharing Data",
    text:
      "- We do not sell your data.\n- Data may be shared with payment partners or legal authorities if required for payouts, compliance, or fraud prevention."
  },
  {
    header: "User Rights",
    text:
      "- You can access and update your personal data via the app or by contacting support.\n- You may request deletion of your account and associated data, subject to regulatory requirements."
  },
  {
    header: "Cookies & Analytics",
    text:
      "- We may use cookies and analytics tools to improve the app experience and performance."
  },
  {
    header: "Changes to Policy",
    text:
      "- Updates to the privacy policy will be posted in the app and notified to users."
  },
  {
    header: "Contact",
    text:
      "For privacy-related questions, please contact support@fundexis.in"
  }
];

export default function PrivacyScreen() {
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
        <Text style={styles.headerText}>Privacy Policy</Text>
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
          By using this app, you consent to this privacy policy.
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