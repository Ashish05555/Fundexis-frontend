import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import InstrumentListScreen from "./screens/InstrumentListScreen";
import OrderScreen from "./screens/OrderScreen";

// DO NOT wrap with NavigationContainer here if you use this as a child navigator in App.js

const Stack = createStackNavigator();

export default function MainNavigation() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Instruments"
        component={InstrumentListScreen}
        options={{ title: "Instruments" }}
      />
      <Stack.Screen
        name="OrderScreen"
        component={OrderScreen}
        options={{ title: "Order" }}
      />
    </Stack.Navigator>
  );
}