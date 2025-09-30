import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useTheme } from "../context/ThemeContext";
import { useFonts } from "expo-font";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Support email for the app
const SUPPORT_EMAIL = "support@fundexis.in";

export default function ProfileScreen({ setUser, navigation }) {
  const { theme } = useTheme();

  // Load vector-icon fonts first to prevent incorrect glyphs/flicker on first paint (especially on web)
  const [iconsReady] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  // Render placeholder box while icon fonts are loading to keep layout stable
  const IconPlaceholder = ({ size = 22 }) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    />
  );
  const IIcon = (props) =>
    iconsReady ? (
      <Ionicons {...props} />
    ) : (
      <IconPlaceholder size={props.size} />
    );
  const MIcon = (props) =>
    iconsReady ? (
      <MaterialIcons {...props} />
    ) : (
      <IconPlaceholder size={props.size} />
    );

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [bankStatus, setBankStatus] = useState("");
  const [bankError, setBankError] = useState("");
  const [bankDetails, setBankDetails] = useState({ account: "", ifsc: "" });
  const [kycStatus, setKycStatus] = useState("");
  const [openSection, setOpenSection] = useState(""); // "account", "kyc", "bank", "payout", "help", "legal"

  useFocusEffect(
    useCallback(() => {
      const fetchProfile = async () => {
        const currUser = auth.currentUser;
        if (currUser) {
          try {
            // Fetch user profile from Firestore
            const userDocRef = doc(db, "users", currUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              setProfile({
                name: data.name || currUser.displayName || "",
                email: data.email || currUser.email || "",
              });
              setBankStatus(data.bankStatus || "");
              setBankError(data.bankError || "");
              setBankDetails({
                account: data.bankAccount || "",
                ifsc: data.ifsc || "",
              });
              setKycStatus(data.kycStatus || "");
            } else {
              setProfile({ name: currUser.displayName || "", email: currUser.email || "" });
              setBankStatus("");
              setBankError("");
              setBankDetails({ account: "", ifsc: "" });
              setKycStatus("");
            }
          } catch (e) {
            setProfile({ name: currUser.displayName || "", email: currUser.email || "" });
            setBankStatus("");
            setBankError("");
            setBankDetails({ account: "", ifsc: "" });
            setKycStatus("");
          }
        }
      };
      fetchProfile();
    }, [])
  );

  const handleSectionPress = (section) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSection(openSection === section ? "" : section);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      Alert.alert("Logout Failed", error.message);
    }
  };

  // Open email composer to contact support (robust for web + native)
  const openSupportEmail = async () => {
    const subject = encodeURIComponent("Support request from Fundexis app");
    const body = encodeURIComponent(
      `Hello Fundexis Support,

Please help me with the following issue:

Name: ${profile?.name || ""}
Email: ${profile?.email || ""}

Thanks,`
    );

    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      SUPPORT_EMAIL
    )}&su=${subject}&body=${body}`;

    try {
      if (Platform.OS === "web") {
        // Try to use the user's default mail handler in the same tab (avoids popup blockers).
        window.location.href = mailtoUrl;

        // If the browser stays on the page (no handler), try Gmail after a short delay.
        setTimeout(async () => {
          if (document.visibilityState === "visible") {
            // Copy email to clipboard for convenience (best-effort).
            try {
              if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(SUPPORT_EMAIL);
              }
            } catch {}

            // Open Gmail compose as a fallback.
            window.open(gmailUrl, "_blank", "noopener,noreferrer");

            // Optional notice for the user.
            Alert.alert(
              "Email",
              `If your email app did not open, we opened Gmail compose in a new tab. You can also email us at ${SUPPORT_EMAIL} (copied to clipboard).`
            );
          }
        }, 700);
        return;
      }

      // Native (iOS/Android)
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Email app not found", `Please email us at ${SUPPORT_EMAIL}`);
      }
    } catch (e) {
      // Last resort fallback on any platform
      try {
        if (Platform.OS === "web") {
          window.open(gmailUrl, "_blank", "noopener,noreferrer");
        } else {
          Alert.alert("Unable to open email", `Please email us at ${SUPPORT_EMAIL}`);
        }
      } catch {
        Alert.alert("Unable to open email", `Please email us at ${SUPPORT_EMAIL}`);
      }
    }
  };

  // Color helpers for status pills
  const kycStatusColor =
    kycStatus === "verified"
      ? theme.statusVerified || "#22b573"
      : kycStatus === "pending"
      ? theme.statusPending || "#f39c12"
      : kycStatus === "rejected"
      ? theme.statusRejected || theme.error
      : theme.textSecondary;

  const bankStatusColor =
    bankStatus === "verified"
      ? theme.statusVerified || "#22b573"
      : bankStatus === "pending"
      ? theme.statusPending || "#f39c12"
      : bankStatus === "rejected"
      ? theme.statusRejected || theme.error
      : theme.textSecondary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header Gradient Card */}
        <View style={[styles.headerCard, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
          <View style={[styles.avatarCircle, { backgroundColor: theme.header, shadowColor: theme.brand }]}>
            <Image
              source={require("../assets/app-icon.png")}
              style={styles.headerIcon}
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerAppName, { color: theme.brand }]}>{profile.name || "Fundexis User"}</Text>
            <Text style={[styles.headerEmail, { color: theme.textSecondary }]}>{profile.email}</Text>
          </View>
        </View>

        {/* Account Details */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("account")}
          >
            <IIcon name="person-circle-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Account Details</Text>
            <View style={{ flex: 1 }} />
            <IIcon
              name={openSection === "account" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
            />
          </TouchableOpacity>
          {openSection === "account" && (
            <View style={styles.subSection}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>Name</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{profile.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>Email</Text>
                <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{profile.email}</Text>
              </View>
            </View>
          )}
        </View>

        {/* KYC / Verification */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("kyc")}
          >
            <MIcon name="verified-user" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>KYC / Verification</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.kycStatus, { color: kycStatusColor }]}>
              {kycStatus === "verified"
                ? "Verified"
                : kycStatus === "pending"
                ? "Pending"
                : kycStatus === "rejected"
                ? "Rejected"
                : "Not Submitted"}
            </Text>
            <IIcon
              name={openSection === "kyc" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
          {openSection === "kyc" && (
            <View style={styles.subSection}>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("KycScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>
                  {kycStatus === "verified" ? "View/Update KYC" : "Complete Your KYC"}
                </Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bank & Payment */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("bank")}
          >
            <IIcon name="card-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Bank & Payment</Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.bankStatus, { color: bankStatusColor }]}>
              {bankStatus === "verified"
                ? "Verified"
                : bankStatus === "pending"
                ? "Pending"
                : bankStatus === "rejected"
                ? "Rejected"
                : "Not Linked"}
            </Text>
            <IIcon
              name={openSection === "bank" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>
          {openSection === "bank" && (
            <View style={styles.subSection}>
              {bankStatus === "verified" && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>Account</Text>
                    <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{bankDetails.account}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: theme.sectionTitle }]}>IFSC</Text>
                    <Text style={[styles.detailValue, { color: theme.textSecondary }]}>{bankDetails.ifsc}</Text>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("BankAccountScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>
                  {bankStatus === "verified" ? "View/Change Bank Account" : "Add/Verify Bank Account"}
                </Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payout */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("payout")}
          >
            <IIcon name="cash-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Payout</Text>
            <View style={{ flex: 1 }} />
            <IIcon
              name={openSection === "payout" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
            />
          </TouchableOpacity>
          {openSection === "payout" && (
            <View style={styles.subSection}>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("PayoutScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>Request a Payout</Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Settings */}
        <TouchableOpacity
          style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          activeOpacity={0.82}
          onPress={() => navigation.navigate("SettingsScreen")}
        >
          <View style={styles.sectionHeaderRow}>
            <IIcon name="settings-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Settings</Text>
            <View style={{ flex: 1 }} />
            <IIcon name="chevron-forward" size={20} color={theme.sectionTitle} />
          </View>
        </TouchableOpacity>

        {/* Help & Support */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("help")}
          >
            <IIcon name="help-circle-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Help & Support</Text>
            <View style={{ flex: 1 }} />
            <IIcon
              name={openSection === "help" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
            />
          </TouchableOpacity>
          {openSection === "help" && (
            <View style={styles.subSection}>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("FAQScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>FAQ / Help Center</Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={openSupportEmail}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>Contact Support (Email)</Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Legal */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity
            style={styles.sectionHeaderRow}
            activeOpacity={0.82}
            onPress={() => handleSectionPress("legal")}
          >
            <IIcon name="document-text-outline" size={22} color={theme.sectionTitle} />
            <Text style={[styles.sectionHeaderText, { color: theme.sectionTitle }]}>Legal</Text>
            <View style={{ flex: 1 }} />
            <IIcon
              name={openSection === "legal" ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.sectionTitle}
            />
          </TouchableOpacity>
          {openSection === "legal" && (
            <View style={styles.subSection}>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("TermsScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>Terms & Conditions</Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.subOption, { backgroundColor: theme.background }]}
                onPress={() => navigation.navigate("PrivacyScreen")}
              >
                <Text style={[styles.subOptionText, { color: theme.brand }]}>Privacy Policy</Text>
                <IIcon name="arrow-forward" size={18} color={theme.sectionTitle} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
    paddingVertical: 22,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 2,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  headerAppName: {
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 0.9,
    marginBottom: 5,
  },
  headerEmail: {
    fontSize: 15,
    fontWeight: "500",
  },
  sectionCard: {
    borderRadius: 16,
    marginHorizontal: 13,
    marginVertical: 7,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    elevation: 0,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 2,
    paddingTop: 14,
    paddingBottom: 12,
    columnGap: 8,
  },
  sectionHeaderText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.2,
  },
  subSection: {
    paddingBottom: 10,
  },
  subOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 3,
    marginVertical: 5,
    paddingVertical: 13,
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  subOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "400",
  },
  kycStatus: {
    fontWeight: "700",
    marginRight: 6,
    fontSize: 15,
  },
  statusVerified: {
    fontWeight: "700",
  },
  statusPending: {
    fontWeight: "700",
  },
  statusRejected: {
    fontWeight: "700",
  },
  bankStatus: {
    fontWeight: "700",
    marginRight: 6,
    fontSize: 15,
  },
  logoutButton: {
    marginBottom: 32,
    marginHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 16,
    elevation: 2,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 17,
    letterSpacing: 0.5,
  },
});