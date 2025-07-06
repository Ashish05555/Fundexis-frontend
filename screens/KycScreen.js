import React, { useState, useEffect } from "react";
import { View, Text, Button, ActivityIndicator, StyleSheet } from "react-native";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";

export default function KycScreen({ navigation }) {
  const user = auth().currentUser;
  const [kycStatus, setKycStatus] = useState("not_started");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = firestore()
      .collection("users")
      .doc(user.uid)
      .onSnapshot((doc) => {
        if (doc.exists) {
          setKycStatus(doc.data().kycStatus || "not_started");
        }
      });
    return () => unsubscribe();
  }, [user]);

  const startKyc = async () => {
    setLoading(true);
    // Optionally: Call your backend to create a KYC session before navigating
    setLoading(false);
    navigation.navigate("KYCWebViewScreen");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>KYC Status: {kycStatus}</Text>
      {kycStatus === "not_started" && (
        <Button title="Start KYC" onPress={startKyc} disabled={loading} />
      )}
      {kycStatus === "pending" && <ActivityIndicator />}
      {kycStatus === "approved" && (
        <Text style={styles.success}>KYC Approved!</Text>
      )}
      {kycStatus === "rejected" && (
        <Text style={styles.error}>KYC Rejected. Please try again.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  heading: { fontSize: 20, marginBottom: 20 },
  success: { color: "green", fontWeight: "bold", marginTop: 20 },
  error: { color: "red", fontWeight: "bold", marginTop: 20 },
});