import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";

export default function PasswordResetScreen({ route, navigation }) {
  const { token } = route.params;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Enter both password fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://your-backend-api/reset-password/${token}`, // Make sure this is your backend URL!
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword })
        }
      );
      const data = await res.json();
      if (res.ok) {
        Alert.alert("Password reset successful!", "You can now sign in.");
        navigation.replace("SignIn");
      } else {
        Alert.alert("Error", data.message || "Could not reset password.");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reset Your Password</Text>
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Resetting..." : "Set New Password"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const BLUE = "#007AFF";
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e1f5fe" },
  header: { fontSize: 22, fontWeight: "bold", color: BLUE, marginBottom: 32 },
  input: { borderWidth: 1, borderColor: "#ececec", borderRadius: 9, padding: 14, fontSize: 16, marginBottom: 18, backgroundColor: "#f7faff", color: "#000", width: "80%", maxWidth: 600 },
  button: { backgroundColor: BLUE, borderRadius: 9, paddingVertical: 14, alignItems: "center", width: "80%", maxWidth: 600 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 },
});