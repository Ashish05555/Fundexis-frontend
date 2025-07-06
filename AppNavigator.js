import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import KycScreen from "./KycScreen";
import KYCWebViewScreen from "./KYCWebViewScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="KycScreen" component={KycScreen} options={{ title: "KYC" }} />
      <Stack.Screen name="KYCWebViewScreen" component={KYCWebViewScreen} options={{ title: "KYC Verification" }} />
    </Stack.Navigator>
  );
}