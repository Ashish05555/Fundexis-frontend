import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // For arrow icons
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { useFocusEffect } from "@react-navigation/native";

export default function ProfileScreen({ setUser, navigation }) {
  const [expanded, setExpanded] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "" });

  // Fetch user profile from Firestore on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchProfile = async () => {
        const currUser = auth().currentUser;
        if (currUser) {
          try {
            const doc = await firestore().collection("users").doc(currUser.uid).get();
            if (doc.exists) {
              setProfile({
                name: doc.data().name || "",
                email: doc.data().email || currUser.email || "",
              });
            } else {
              setProfile({ name: "", email: currUser.email || "" });
            }
          } catch (e) {
            setProfile({ name: "", email: currUser.email || "" });
          }
        }
      };
      fetchProfile();
    }, [])
  );

  const handleExpand = (key) => {
    setExpanded(expanded === key ? null : key);
  };

  const handleLogout = async () => {
    try {
      await auth().signOut();
      // setUser(null); // Not needed if you use onAuthStateChanged in App.js
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  const PROFILE_OPTIONS = [
    {
      key: "account",
      label: "Account Details",
      secondary: [
        { key: "name", label: "Name", value: profile.name },
        { key: "email", label: "Email", value: profile.email }
      ]
    },
    {
      key: "kyc",
      label: "KYC / Verification",
      secondary: [
        { 
          key: "completeKyc", 
          label: "Complete your KYC", 
          onPress: () => navigation.navigate("KycStack") // Navigate to KYC flow
        }
      ]
    },
    {
      key: "bank",
      label: "Bank & Payment Details",
      secondary: [
        { key: "manageBank", label: "Manage Bank Account", onPress: () => Alert.alert("Bank", "Open Bank details") }
      ]
    },
    {
      key: "settings",
      label: "Settings",
      secondary: [
        { key: "changePassword", label: "Change Password", onPress: () => Alert.alert("Change Password", "Open Change Password screen") },
        { key: "changeEmail", label: "Change Email", onPress: () => Alert.alert("Change Email", "Open Change Email screen") },
        {
          key: "darkMode",
          label: "Dark Mode",
          render: (darkMode, setDarkMode) => (
            <Switch value={darkMode} onValueChange={setDarkMode} />
          )
        }
      ]
    },
    {
      key: "help",
      label: "Help & Support",
      secondary: [
        { key: "faq", label: "FAQ / Help Center", onPress: () => Alert.alert("FAQ", "Open FAQ") },
        { key: "contactEmail", label: "Contact Support (Email)", onPress: () => Alert.alert("Contact Support", "Open email composer") }
      ]
    },
    {
      key: "legal",
      label: "Legal",
      secondary: [
        { key: "terms", label: "Terms & Conditions", onPress: () => Alert.alert("Terms", "Show Terms & Conditions") },
        { key: "privacy", label: "Privacy Policy", onPress: () => Alert.alert("Privacy", "Show Privacy Policy") }
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* User name at top left */}
      <View style={styles.headerRow}>
        <Text style={styles.userName}>{profile.name || "Profile"}</Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 32 }}>
        {PROFILE_OPTIONS.map((option) => (
          <View key={option.key} style={styles.mainOptionWrap}>
            <TouchableOpacity
              style={styles.mainOptionRow}
              onPress={() => handleExpand(option.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.mainOptionLabel}>{option.label}</Text>
              <Ionicons
                name={expanded === option.key ? "chevron-up" : "chevron-down"}
                size={22}
                color="#888"
              />
            </TouchableOpacity>
            {expanded === option.key && (
              <View style={styles.secondaryOptionsWrap}>
                {option.secondary.map((sec) => (
                  <View key={sec.key} style={styles.secondaryOptionRow}>
                    <TouchableOpacity
                      onPress={sec.onPress}
                      activeOpacity={sec.onPress ? 0.7 : 1}
                      style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                      disabled={!sec.onPress}
                    >
                      <Text style={styles.secondaryOptionLabel}>{sec.label}</Text>
                      {/* Value display */}
                      {sec.value && (
                        <Text style={styles.secondaryOptionValue}>{sec.value}</Text>
                      )}
                      {/* Custom renderer for switches etc */}
                      {typeof sec.render === "function" &&
                        sec.render(darkMode, setDarkMode)}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Spacer so logout isn't covered */}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Logout button at the bottom */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7fafe" },
  headerRow: {
    paddingTop: 40,
    paddingBottom: 18,
    paddingLeft: 16,
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
    marginBottom: 8,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#222e50",
    textAlign: "left",
  },
  scrollArea: { flex: 1 },
  mainOptionWrap: {
    backgroundColor: "#fff",
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  mainOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  mainOptionLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#007aff",
  },
  secondaryOptionsWrap: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    backgroundColor: "#f6fafd",
    paddingBottom: 6,
  },
  secondaryOptionRow: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#ecf1f7",
  },
  secondaryOptionLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  secondaryOptionValue: {
    fontSize: 16,
    color: "#555",
    marginLeft: 10,
    fontWeight: "400",
    textAlign: "right",
  },
  logoutButton: {
    marginBottom: 32,
    marginHorizontal: 14,
    backgroundColor: "#e53935",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 16,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
    letterSpacing: 0.5,
  },
});