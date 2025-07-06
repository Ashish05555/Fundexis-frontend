import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export default function KYCWebViewScreen({ navigation }) {
  // Construct the KYC provider URL with the current user's info, as required by your provider.
  const user = auth().currentUser;
  const kycUrl = `https://your-kyc-provider.com/start?email=${user?.email}&uid=${user?.uid}`;

  // Listen for the KYC completion URL (adjust as per your provider's docs)
  const handleNavigationStateChange = async (navState) => {
    if (navState.url.includes("kyc-success")) {
      // Mark KYC as pending in Firestore, actual approval comes from webhook!
      await firestore().collection("users").doc(user.uid).set({
        kycStatus: "pending",
      }, { merge: true });
      navigation.goBack();
      // Optionally show a success message
    }
    if (navState.url.includes("kyc-failed")) {
      // Optionally handle failure
      navigation.goBack();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        source={{ uri: kycUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#007aff" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
});