import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_EMAIL = "support@fundexis.in";

export default function ProfileScreen({ setUser }) {
  const navigation = useNavigation();

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [bankStatus, setBankStatus] = useState("");
  const [bankError, setBankError] = useState("");
  const [bankDetails, setBankDetails] = useState({ account: "", ifsc: "" });
  const [kycStatus, setKycStatus] = useState("");
  const [openSection, setOpenSection] = useState("");

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      console.log("[ProfileScreen] useFocusEffect: Fetching profile...");
      const fetchProfile = async () => {
        const currUser = auth.currentUser;
        console.log("[ProfileScreen] Current Firebase user:", currUser);
        if (currUser) {
          try {
            const userDocRef = doc(db, "users", currUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (!mounted) return;
            if (userDoc.exists()) {
              const data = userDoc.data() || {};
              console.log("[ProfileScreen] Firestore user profile:", data);
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
              console.log("[ProfileScreen] Firestore userDoc does not exist, using Firebase user only");
            }
          } catch (e) {
            // fallback to auth profile on error
            console.error("[ProfileScreen] Error fetching Firestore userDoc:", e);
            const currUser = auth.currentUser;
            if (!mounted) return;
            setProfile({ name: currUser?.displayName || "", email: currUser?.email || "" });
            setBankStatus("");
            setBankError("");
            setBankDetails({ account: "", ifsc: "" });
            setKycStatus("");
          }
        } else {
          console.log("[ProfileScreen] No user signed in.");
        }
      };

      fetchProfile();

      return () => {
        mounted = false;
        console.log("[ProfileScreen] useFocusEffect cleanup.");
      };
    }, [])
  );

  const handleSectionPress = (section) => {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (e) {
      // ignore if animation unavailable
      console.warn("[ProfileScreen] LayoutAnimation error:", e);
    }
    setOpenSection((prev) => (prev === section ? "" : section));
    console.log(`[ProfileScreen] Section toggled: ${section} (now open: ${openSection === section ? "" : section})`);
  };

  // ---- LOGOUT FIX and LOGS ----
  const handleLogout = async () => {
    console.log("[ProfileScreen] Logout button pressed.");
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: () => console.log("[ProfileScreen] Logout cancelled by user."),
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            console.log("[ProfileScreen] Proceeding with Firebase signOut...");
            await signOut(auth);
            console.log("[ProfileScreen] Firebase signOut completed.");
            if (typeof setUser === "function") {
              setUser(null);
              console.log("[ProfileScreen] Called setUser(null) to clear app state.");
            } else {
              console.warn("[ProfileScreen] setUser is not a function!");
            }
            // App.js should switch to SignIn automatically now.
            console.log("[ProfileScreen] Logout flow complete. App.js should now show SignIn.");
          } catch (error) {
            console.error("[ProfileScreen] Logout error:", error);
            Alert.alert("Logout Failed", error?.message || "An error occurred during logout. Please try again.");
          }
        },
      },
    ]);
  };

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
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Email app not found", `Please email us at ${SUPPORT_EMAIL}`);
      }
    } catch (e) {
      Alert.alert("Unable to open email", `Please email us at ${SUPPORT_EMAIL}`);
    }
  };

  const calculateCompletion = () => {
    let completed = 0;
    const total = 4;
    if (profile.name && profile.email) completed++;
    if (kycStatus === "verified") completed++;
    if (bankStatus === "verified") completed++;
    if (bankDetails.account && bankDetails.ifsc) completed++;
    return Math.round((completed / total) * 100);
  };
  const completionPercentage = calculateCompletion();

  const StatusBadge = ({ status, type = "kyc" }) => {
    let bgColor, textColor, icon, label;
    if (status === "verified") {
      bgColor = "#D1FAE5";
      textColor = "#059669";
      icon = "checkmark-circle";
      label = "Completed";
    } else if (status === "pending") {
      bgColor = "#FEF3C7";
      textColor = "#D97706";
      icon = "time";
      label = "Pending";
    } else if (status === "rejected") {
      bgColor = "#FEE2E2";
      textColor = "#DC2626";
      icon = "close-circle";
      label = "Rejected";
    } else {
      bgColor = "#F3F4F6";
      textColor = "#6B7280";
      icon = "ellipse";
      label = type === "kyc" ? "Not Submitted" : "Not Linked";
    }
    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={14} color={textColor} />
        <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#2563EB", "#1E40AF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.avatarHeaderContainer}>
          <LinearGradient
            colors={["#2563EB", "#1E40AF", "#4F8FFF"]}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{profile.name ? profile.name.charAt(0).toUpperCase() : "F"}</Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileCardContent}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name || "Fundexis User"}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={styles.completionSection}>
                <View style={styles.completionHeader}>
                  <Text style={styles.completionLabel}>Profile Completion</Text>
                  <Text style={styles.completionPercentage}>{completionPercentage}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBarFill, { width: `${completionPercentage}%` }]} />
                </View>
                <Text style={styles.completionHint}>Complete your profile to unlock all features</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("account")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="person-circle-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>Account Details</Text>
                  <StatusBadge status="verified" />
                </View>
                <Text style={styles.menuDescription}>Manage your personal information</Text>
              </View>
              <Ionicons name={openSection === "account" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "account" && (
              <View style={styles.expandedContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Name</Text>
                  <Text style={styles.detailValue}>{profile.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{profile.email}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("kyc")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <MaterialIcons name="verified-user" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>KYC / Verification</Text>
                  <StatusBadge status={kycStatus} type="kyc" />
                </View>
                <Text style={styles.menuDescription}>Verify your identity</Text>
              </View>
              <Ionicons name={openSection === "kyc" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "kyc" && (
              <View style={styles.expandedContent}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("KycScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>{kycStatus === "verified" ? "View/Update KYC" : "Complete Your KYC"}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("bank")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="card-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <View style={styles.menuTitleRow}>
                  <Text style={styles.menuTitle}>Bank & Payment</Text>
                  <StatusBadge status={bankStatus} type="bank" />
                </View>
                <Text style={styles.menuDescription}>Manage payment methods</Text>
              </View>
              <Ionicons name={openSection === "bank" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "bank" && (
              <View style={styles.expandedContent}>
                {bankStatus === "verified" && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account</Text>
                      <Text style={styles.detailValue}>{bankDetails.account}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>IFSC</Text>
                      <Text style={styles.detailValue}>{bankDetails.ifsc}</Text>
                    </View>
                  </>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("BankAccountScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>{bankStatus === "verified" ? "View/Change Bank Account" : "Add/Verify Bank Account"}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("payout")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="cash-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Payout</Text>
                <Text style={styles.menuDescription}>See payout criteria</Text>
              </View>
              <Ionicons name={openSection === "payout" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "payout" && (
              <View style={styles.expandedContent}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("PayoutScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>Request a Payout</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => navigation.navigate("SettingsScreen")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="settings-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Settings</Text>
                <Text style={styles.menuDescription}>App preferences and security</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("help")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="help-circle-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Help & Support</Text>
                <Text style={styles.menuDescription}>Get help and support</Text>
              </View>
              <Ionicons name={openSection === "help" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "help" && (
              <View style={styles.expandedContent}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("FAQScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>FAQ / Help Center</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={openSupportEmail} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>Contact Support (Email)</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuCard} activeOpacity={0.9} onPress={() => handleSectionPress("legal")}>
            <View style={styles.menuCardContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#2563EB" />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuTitle}>Legal</Text>
                <Text style={styles.menuDescription}>Terms, privacy & policies</Text>
              </View>
              <Ionicons name={openSection === "legal" ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
            </View>
            {openSection === "legal" && (
              <View style={styles.expandedContent}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("TermsScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>Terms & Conditions</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("PrivacyScreen")} activeOpacity={0.7}>
                  <Text style={styles.actionButtonText}>Privacy Policy</Text>
                  <Ionicons name="arrow-forward" size={18} color="#2563EB" />
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          {/* --- LOGOUT BUTTON WITH LOG --- */}
          <TouchableOpacity
            style={styles.logoutCard}
            activeOpacity={0.9}
            onPress={() => {
              console.log("[ProfileScreen] Logout button truly pressed!");
              handleLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4FF",
  },
  gradientHeader: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 2,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  avatarHeaderContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: -32,
  },
  avatarCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 3,
    borderColor: "#fff",
    backgroundColor: "transparent",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "#17347d",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileCard: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  profileCardContent: {
    padding: 20,
    paddingTop: 36,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  profileEmail: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 16,
    textAlign: "center",
  },
  completionSection: {
    marginTop: 8,
  },
  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  completionPercentage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  completionHint: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  menuSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  menuCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.2,
  },
  menuDescription: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  detailValue: {
    fontSize: 14,
    color: "#6B7280",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2563EB",
  },
  separator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 8,
  },
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.3,
    marginLeft: 8,
  },
});