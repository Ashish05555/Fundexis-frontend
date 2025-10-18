import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

// Conditionally import for React Native only
let RazorpayCheckout;
if (Platform.OS !== "web") {
  RazorpayCheckout = require("react-native-razorpay").default;
}

// Web: Load Razorpay script dynamically
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const API_BASE = "https://fundexis-backend-758832599619.us-central1.run.app";

export default function RazorpayScreen() {
  const navigation = useNavigation();
  const { challenge } = useRoute().params;
  const [loading, setLoading] = useState(false);

  // Always clean up loading state on unmount
  useEffect(() => () => setLoading(false), []);

  // Start payment immediately on mount
  useEffect(() => {
    startPayment();
    // eslint-disable-next-line
  }, []);

  async function startPayment() {
    setLoading(true);
    try {
      const amountToSend = challenge.fee * 100; // fee is in rupees, Razorpay needs paise
      // 1. Create order on backend
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountToSend, // paise
          challenge: challenge.type,
        }),
      });
      const order = await res.json();
      if (!order.id || !order.amount) {
        setLoading(false);
        throw new Error("Could not create order. Please try again.");
      }

      // 2. Open Razorpay payment dialog based on platform
      if (Platform.OS === "web") {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          setLoading(false);
          alert("Failed to load Razorpay SDK. Are you online?");
          navigation.goBack();
          return;
        }
        const options = {
          key: "rzp_live_RKeiX5h2puX8ZI", // <-- PUT YOUR LIVE KEY HERE
          amount: order.amount,
          currency: "INR",
          name: "Fundexis",
          description: `Purchase ${challenge.title}`,
          order_id: order.id,
          handler: async function (response) {
            setLoading(true);
            const verifyRes = await fetch(`${API_BASE}/api/payment/verify-razorpay`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                challenge: challenge.type,
              }),
            });
            const verifyResult = await verifyRes.json();
            setLoading(false);
            if (verifyResult.success) {
              alert("Payment successful! Challenge unlocked.");
              navigation.navigate("DemoTrading");
            } else {
              alert("Payment verification failed.");
              navigation.goBack();
            }
          },
          prefill: {
            email: "user@email.com",
            contact: "9999999999"
          },
          theme: { color: "#2540F6" },
          modal: {
            ondismiss: () => {
              setLoading(false);
              navigation.goBack();
            }
          }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Mobile version (react-native-razorpay)
        const options = {
          description: `Purchase ${challenge.title}`,
          image: "https://fundexis.in/logo192.png",
          currency: "INR",
          key: "rzp_live_RKeiX5h2puX8ZI", // <-- PUT YOUR LIVE KEY HERE
          amount: order.amount,
          order_id: order.id,
          name: "Fundexis",
          prefill: {
            email: "user@email.com",
            contact: "9999999999"
          },
          theme: { color: "#2540F6" }
        };
        RazorpayCheckout.open(options)
          .then(async data => {
            setLoading(true);
            const verifyRes = await fetch(`${API_BASE}/api/payment/verify-razorpay`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: data.razorpay_order_id,
                razorpay_payment_id: data.razorpay_payment_id,
                razorpay_signature: data.razorpay_signature,
                challenge: challenge.type,
              }),
            });
            const verifyResult = await verifyRes.json();
            setLoading(false);
            if (verifyResult.success) {
              Alert.alert("Payment successful!", "Challenge unlocked.", [
                { text: "OK", onPress: () => navigation.navigate("DemoTrading") }
              ]);
            } else {
              Alert.alert("Payment verification failed.");
              navigation.goBack();
            }
          })
          .catch(error => {
            setLoading(false);
            if (error && error.description) {
              Alert.alert("Payment Cancelled", error.description);
            } else {
              Alert.alert("Payment Cancelled");
            }
            navigation.goBack();
          });
      }
    } catch (err) {
      setLoading(false);
      if (Platform.OS === "web") {
        alert(err.message || "Payment initialization failed");
      } else {
        Alert.alert("Error", err.message || "Payment initialization failed");
      }
      navigation.goBack();
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#2540F6" />
      <Text style={{ marginTop: 18, color: "#2540F6", fontSize: 16 }}>
        Opening payment window...
      </Text>
    </View>
  );
}