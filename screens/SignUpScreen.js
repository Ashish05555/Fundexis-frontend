import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function SignUpScreen({ navigation, setUser }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert("All fields are required!");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Passwords do not match!");
      return;
    }
    try {
      // Create user in Firebase Auth
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);

      // Save user profile in Firestore
      await firestore().collection("users").doc(userCredential.user.uid).set({
        name,
        email,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      setUser({ uid: userCredential.user.uid, name, email });
      navigation.replace("MainTabs");
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        Alert.alert("That email address is already in use!");
      } else if (error.code === "auth/invalid-email") {
        Alert.alert("That email address is invalid!");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Password should be at least 6 characters.");
      } else {
        Alert.alert("Sign up failed!", error.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create Account</Text>
      <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />
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
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      <TouchableOpacity style={styles.signUpBtn} onPress={handleSignUp}>
        <Text style={styles.signUpBtnText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
        <Text style={styles.switchText}>
          Already have an account? <Text style={{ color: "#007AFF" }}>Sign In</Text>
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
  signUpBtn: {
    backgroundColor: "#007AFF", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginBottom: 12
  },
  signUpBtnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  switchText: { color: "#555", textAlign: "center", marginTop: 16, fontSize: 15 }
});