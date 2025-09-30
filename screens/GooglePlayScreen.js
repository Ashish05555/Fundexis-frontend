import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Button, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

export default function GooglePlayScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { challenge } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [products, setProducts] = useState([]);
  const productId = challenge?.billingKey || "challenge_basic";

  // Only attempt to load IAP on Android
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let mounted = true, RNIap;
    (async () => {
      try {
        RNIap = await import("react-native-iap");
        await RNIap.initConnection();
        const items = await RNIap.getProducts([productId]);
        if (mounted) setProducts(items);
      } catch (e) {
        setError(e.message);
      }
    })();
    return () => {
      mounted = false;
      // End connection if possible
      if (RNIap && typeof RNIap.endConnection === "function") {
        RNIap.endConnection();
      }
    };
    // eslint-disable-next-line
  }, []);

  const purchase = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    if (Platform.OS !== "android") {
      setError("Google Play purchases are only supported on Android.");
      setLoading(false);
      return;
    }
    try {
      const RNIap = await import("react-native-iap");
      const purchaseResult = await RNIap.requestPurchase({ skus: [productId] });
      // Replace with your backend verification logic as before
      const verifyRes = await fetch(
        "http://localhost:5000/api/payment/purchase/google/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: purchaseResult.productId,
            purchaseToken: purchaseResult.purchaseToken,
            userId: "testuser123",
            challenge: challenge?.type,
          }),
        }
      );
      if (!verifyRes.ok) {
        const errText = await verifyRes.text();
        setError("Server error: " + errText);
        setLoading(false);
        return;
      }
      const verifyResult = await verifyRes.json();
      setLoading(false);
      if (verifyResult.success) {
        setSuccess(true);
      } else {
        setError("Verification failed. Please contact support.");
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || "Purchase failed");
    }
  };

  const goToTrading = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "MainTabs",
          state: {
            index: 2,
            routes: [
              { name: "Home" },
              { name: "Challenges" },
              { name: "Trade" },
              { name: "Profile" },
            ],
          },
        },
      ],
    });
  };

  // Web platform UI
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#555", fontSize: 18, marginBottom: 20 }}>
          Google Play payments are only supported on Android devices.
        </Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  // Android & other platforms UI
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#2540F6" />
          <Text style={{ marginTop: 18, color: "#2540F6", fontSize: 16 }}>
            Processing Google Play purchase...
          </Text>
        </>
      ) : success ? (
        <>
          <Text style={{ color: "green", fontSize: 20, marginBottom: 20 }}>
            Purchase Successful! Challenge Unlocked.
          </Text>
          <Button title="Go to Trading" onPress={goToTrading} />
        </>
      ) : (
        <>
          {error ? (
            <Text style={{ color: "red", marginBottom: 10 }}>{error}</Text>
          ) : null}
          <Button
            title="Continue with Google Play"
            onPress={purchase}
            disabled={Platform.OS !== "android"}
          />
        </>
      )}
    </View>
  );
}