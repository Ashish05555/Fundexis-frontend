import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView, // <-- Add this
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../firebase";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from "../context/ThemeContext";
import CustomHeader from "../components/CustomHeader"; // <-- Import the header

const BRAND_BLUE = "#120FD8";
const CARD_BG = "#F7F8FF";
const BORDER = "#E9EEFF";

export default function SettingsScreen({ navigation, user, setUser }) {
  const { theme, toggleTheme } = useTheme();
  const [themeLoading, setThemeLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);

  // Edit name modal state
  const [newName, setNewName] = useState(user?.name || "");
  const [nameLoading, setNameLoading] = useState(false);

  // Password modal state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Email modal state
  const [emailPassword, setEmailPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // --- EDIT NAME ---
  const handleEditName = async () => {
    if (!newName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    setNameLoading(true);
    try {
      const firestore = getFirestore();
      await updateDoc(doc(firestore, "users", auth.currentUser.uid), { name: newName.trim() });
      if (setUser) setUser({ ...user, name: newName.trim() });
      setShowEditNameModal(false);
      Alert.alert("Success", "Name updated!");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update name.");
    }
    setNameLoading(false);
  };

  // --- CHANGE PASSWORD ---
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password should be at least 6 characters.");
      return;
    }
    setPwLoading(true);
    try {
      const user = auth.currentUser;
      const cred = auth.EmailAuthProvider.credential(user.email, oldPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPassword);
      Alert.alert("Success", "Your password has been updated!");
      setShowPasswordModal(false);
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to change password.");
    }
    setPwLoading(false);
  };

  // --- CHANGE EMAIL ---
  const handleChangeEmail = async () => {
    if (!emailPassword || !newEmail) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    setEmailLoading(true);
    try {
      const user = auth.currentUser;
      const cred = auth.EmailAuthProvider.credential(user.email, emailPassword);
      await user.reauthenticateWithCredential(cred);
      await user.updateEmail(newEmail);
      await user.sendEmailVerification();
      Alert.alert("Success", "Email updated! Please verify your new email address.");
      setShowEmailModal(false);
      setEmailPassword(""); setNewEmail("");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to change email.");
    }
    setEmailLoading(false);
  };

  // --- DARK MODE TOGGLE ---
  const handleToggleTheme = async () => {
    setThemeLoading(true);
    try {
      await toggleTheme();
      const currUser = auth.currentUser;
      if (currUser) {
        const firestore = getFirestore();
        await setDoc(doc(firestore, "users", currUser.uid), { theme: theme.mode === "light" ? "dark" : "light" }, { merge: true });
      }
    } catch (e) { }
    setThemeLoading(false);
  };

  const modeLabel = theme.mode === "light" ? "Light Mode" : "Dark Mode";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomHeader title="Settings" />
      {/* Remove duplicate heading */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Edit Name */}
        <TouchableOpacity
          style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setShowEditNameModal(true)}
        >
          <Text style={[styles.itemText, { color: theme.text }]}>Edit Name</Text>
          <Text style={styles.itemValue}>{user?.name || ""}</Text>
          <Ionicons name="create-outline" size={20} color={theme.brand} style={{ marginLeft: 2 }} />
        </TouchableOpacity>

        {/* Change Password */}
        <TouchableOpacity style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowPasswordModal(true)}>
          <Text style={[styles.itemText, { color: theme.text }]}>Change Password</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </TouchableOpacity>

        {/* Change Email */}
        <TouchableOpacity style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setShowEmailModal(true)}>
          <Text style={[styles.itemText, { color: theme.text }]}>Change Email</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.brand} />
        </TouchableOpacity>

        {/* Dark Mode */}
        <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.itemText, { color: theme.text }]}>{modeLabel}</Text>
          {themeLoading ? (
            <ActivityIndicator size="small" color={theme.brand} />
          ) : (
            <Switch
              value={theme.mode === "dark"}
              onValueChange={handleToggleTheme}
              thumbColor={theme.mode === "dark" ? theme.brand : "#ccc"}
            />
          )}
        </View>
      </ScrollView>
      {/* ...Modals unchanged... */}
      {/* Edit Name Modal */}
      <Modal visible={showEditNameModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: theme.brand }]}>Edit Name</Text>
            <TextInput
              placeholder="Enter new name"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditName} style={[styles.saveBtn, { backgroundColor: theme.brand }]} disabled={nameLoading}>
                {nameLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: theme.brand }]}>Change Password</Text>
            <TextInput
              placeholder="Current Password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              onChangeText={setOldPassword} value={oldPassword}
            />
            <TextInput
              placeholder="New Password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              onChangeText={setNewPassword} value={newPassword}
            />
            <TextInput
              placeholder="Confirm New Password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              onChangeText={setConfirmPassword} value={confirmPassword}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangePassword} style={[styles.saveBtn, { backgroundColor: theme.brand }]} disabled={pwLoading}>
                {pwLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Change Email Modal */}
      <Modal visible={showEmailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: theme.brand }]}>Change Email</Text>
            <TextInput
              placeholder="Password"
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              onChangeText={setEmailPassword} value={emailPassword}
            />
            <TextInput
              placeholder="New Email"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              onChangeText={setNewEmail} value={newEmail}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
              <TouchableOpacity onPress={() => setShowEmailModal(false)} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleChangeEmail} style={[styles.saveBtn, { backgroundColor: theme.brand }]} disabled={emailLoading}>
                {emailLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CARD_BG, padding: 18 },
  // sectionTitle: { fontSize: 19, fontWeight: "700", color: BRAND_BLUE, marginBottom: 13 }, // REMOVE this line
  item: {
    backgroundColor: "#EFF1FF",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  itemText: { fontSize: 16, color: "#222", fontWeight: "600" },
  itemValue: { fontSize: 15, color: BRAND_BLUE, fontWeight: "500", marginRight: 7 },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center"
  },
  modalCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "90%", elevation: 5
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: BRAND_BLUE, marginBottom: 16, textAlign: "center" },
  input: {
    backgroundColor: "#F6F8FD", borderRadius: 9, fontSize: 15, marginBottom: 10, padding: 11, borderWidth: 1, borderColor: BORDER
  },
  cancelBtn: {
    paddingVertical: 11, paddingHorizontal: 20, borderRadius: 8, backgroundColor: "#F5F5F5"
  },
  cancelText: { color: "#444", fontWeight: "700", fontSize: 15 },
  saveBtn: {
    paddingVertical: 11, paddingHorizontal: 20, borderRadius: 8, backgroundColor: BRAND_BLUE
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});