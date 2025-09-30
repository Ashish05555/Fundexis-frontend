import React from "react";
import { ScrollView, View, Text, StyleSheet, Platform, TouchableOpacity } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function PrivacyScreen() {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const navigation = useNavigation();

  return (
    <ScrollView
      style={
        Platform.OS === "web"
          ? { backgroundColor: theme.background, height: "100vh" }
          : { backgroundColor: theme.background, flex: 1 }
      }
      contentContainerStyle={styles.container}
    >
      {/* Custom Back Arrow Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.arrowContainer}>
          <Ionicons name="arrow-back" size={28} color={theme.brand} />
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.brand }]}>
          Privacy Policy
        </Text>
        <View style={{ width: 40 }} /> {/* Spacer for symmetry */}
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - Personal identification: Name, email, bank information, KYC documents.{"\n"}
          - Trading activity: Statistics, challenge participation, payouts.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>2. How We Use Your Information</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - To provide app features, process challenges, and facilitate payouts.{"\n"}
          - For account verification, KYC compliance, and security.{"\n"}
          - For analytics and app improvements.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>3. Data Protection</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - Data is stored on secure, encrypted servers.{"\n"}
          - Only authorized personnel can access sensitive data.{"\n"}
          - We regularly review security practices to protect user data.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>4. Sharing Data</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - We do not sell your data.{"\n"}
          - Data may be shared with payment partners or legal authorities if required for payouts, compliance, or fraud prevention.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>5. User Rights</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - You can access and update your personal data via the app or by contacting support.{"\n"}
          - You may request deletion of your account and associated data, subject to regulatory requirements.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>6. Cookies & Analytics</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - We may use cookies and analytics tools to improve the app experience and performance.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>7. Changes to Policy</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          - Updates to the privacy policy will be posted in the app and notified to users.
        </Text>
      </View>

      <View style={[
        styles.card,
        {
          backgroundColor: theme.card,
          shadowColor: isDark ? theme.brand : "#2540F6",
          borderColor: isDark ? "#2a2a2a" : "#eee",
          borderWidth: isDark ? 1 : 0,
        }
      ]}>
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>8. Contact</Text>
        <Text style={[styles.paragraph, { color: theme.text }]}>
          For privacy-related questions, please contact <Text style={{ color: theme.brand }}>support@fundexis.in</Text>
        </Text>
      </View>

      <Text style={[styles.footer, { color: theme.text }]}>
        By using this app, you consent to this privacy policy.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    marginTop: Platform.OS === "ios" ? 20 : 0,
  },
  arrowContainer: {
    width: 40,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  header: {
    flex: 1,
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
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