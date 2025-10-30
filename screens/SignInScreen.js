import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function SignInScreen({ navigation, setUser }) {
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  function showPopup(message) {
    setPopupMessage(message);
    setPopupVisible(true);
    setTimeout(() => setPopupVisible(false), 2500);
  }

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      let userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          provider: "google",
          createdAt: new Date(),
        });
        userDoc = await getDoc(userDocRef);
      }
      const userData = userDoc.data();
      setUser({ uid: userCredential.user.uid, ...userData });
      showPopup("Signed in with Google!");
      setTimeout(() => navigation.replace("MainTabs"), 900);
    } catch (err) {
      showPopup("Google sign-in failed: " + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={popupVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPopupVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPopupVisible(false)}>
          <View style={styles.popupBox}>
            <Text style={styles.popupText}>{popupMessage}</Text>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.innerContainer}>
        <View style={styles.logoWrapper}>
          <Image source={require("../assets/app-icon.png")} style={styles.logoImg} resizeMode="contain" />
          <Text style={styles.glowAppName}>FUNDEXIS</Text>
        </View>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
          >
            <Ionicons name="logo-google" size={24} color="#007AFF" style={{ marginRight: 10 }} />
            <Text style={styles.googleBtnText}>Sign In with Google</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.replace("SignUp")}>
          <Text style={styles.switchText}>
            <Text style={styles.switchLabel}>Don&apos;t have an account? </Text>
            <Text style={styles.switchLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BLUE = "#007AFF";
const BACKGROUND = "#007AFF";
const WHITE = "#fff";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100%",
  },
  innerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginTop: -30,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(40,40,40,0.18)",
  },
  popupBox: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 13,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.23,
    shadowRadius: 13,
    alignItems: "center",
    minWidth: 200,
    maxWidth: 300,
  },
  popupText: {
    fontSize: 16,
    color: BLUE,
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 12,
  },
  logoWrapper: {
    alignItems: "center",
    marginBottom: 35,
    marginTop: 0,
    width: "100%",
  },
  logoImg: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  glowAppName: {
    fontSize: 34,
    fontWeight: "bold",
    color: WHITE,
    letterSpacing: 2,
    marginBottom: 4,
    textTransform: "uppercase",
    textAlign: "center",
    textShadowColor: "#4fc3f7",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: 18,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10,
    borderWidth: 0,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
    borderRadius: 25,
    paddingVertical: 18,
    paddingHorizontal: 32,
    marginBottom: 2,
    elevation: 2,
    minWidth: 250,
    maxWidth: 320,
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 2,
    borderColor: "#e3f2fd",
  },
  googleBtnText: {
    color: BLUE,
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  switchText: {
    color: WHITE,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 12,
    fontWeight: "500",
    marginTop: 10,
  },
  switchLabel: {
    color: WHITE,
  },
  switchLink: {
    color: WHITE,
    fontWeight: "bold",
    fontSize: 16,
    textDecorationLine: "underline",
    backgroundColor: "transparent",
    paddingLeft: 2,
  },
});