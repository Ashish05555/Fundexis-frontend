import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function SignInScreen({ navigation, setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Please enter both email and password!");
      return;
    }
    try {
      // Sign in with Firebase Auth
      const userCredential = await auth().signInWithEmailAndPassword(email, password);

      // Load user profile from Firestore
      const userDoc = await firestore().collection("users").doc(userCredential.user.uid).get();
      const userData = userDoc.data();
      setUser({ uid: userCredential.user.uid, ...userData });

      navigation.replace("MainTabs");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        Alert.alert("No account found. Please sign up first!");
      } else if (error.code === "auth/wrong-password") {
        Alert.alert("Invalid password!");
      } else {
        Alert.alert("Sign in failed!", error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
        <Text style={styles.signInBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
        <Text style={styles.switchText}>
          Don&apos;t have an account? <Text style={{ color: "#007AFF" }}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faff", padding: 24, justifyContent: "center" },
  header: { fontSize: 28, fontWeight: "bold", color: "#007AFF", marginBottom: 36, alignSelf: "center" },
  input: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 7, padding: 14,
    fontSize: 16, marginBottom: 18, backgroundColor: "#fff"
  },
  signInBtn: {
    backgroundColor: "#007AFF", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginBottom: 12
  },
  signInBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  switchText: { color: "#555", textAlign: "center", marginTop: 16, fontSize: 15 }
});