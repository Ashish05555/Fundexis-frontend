import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

// Firebase imports
import auth from "@react-native-firebase/auth";

// Import your screens
import HomeScreen from "./screens/HomeScreen";
import ChallengesScreen from "./screens/ChallengesScreen";
import DemoTradingScreen from "./screens/DemoTradingScreen";
import ProfileScreen from "./screens/ProfileScreen";
import OrderScreen from "./screens/OrderScreen";
import InstrumentDetailScreen from "./screens/InstrumentDetailScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
// Import your KYC screens
import KycScreen from "./screens/KycScreen";
import KYCWebViewScreen from "./screens/KYCWebViewScreen";

const DemoTradeStack = createStackNavigator();
function DemoTradeStackScreen() {
  return (
    <DemoTradeStack.Navigator>
      <DemoTradeStack.Screen
        name="DemoTrading"
        component={DemoTradingScreen}
        options={{ title: "Demo Trading" }}
      />
      <DemoTradeStack.Screen
        name="InstrumentDetail"
        component={InstrumentDetailScreen}
        options={{ title: "Instrument Details" }}
      />
      <DemoTradeStack.Screen
        name="OrderScreen"
        component={OrderScreen}
        options={{ title: "Order" }}
      />
    </DemoTradeStack.Navigator>
  );
}

// KYC Stack for handling KYC flow
const KycStack = createStackNavigator();
function KycStackScreen() {
  return (
    <KycStack.Navigator>
      <KycStack.Screen
        name="KycScreen"
        component={KycScreen}
        options={{ title: "KYC" }}
      />
      <KycStack.Screen
        name="KYCWebViewScreen"
        component={KYCWebViewScreen}
        options={{ title: "KYC Verification" }}
      />
    </KycStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
function MainTabs({ setUser, navigation }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home";
          else if (route.name === "Challenges") iconName = "trophy";
          else if (route.name === "Trade") iconName = "bar-chart";
          else if (route.name === "Profile") iconName = "person-circle";
          else iconName = "ellipse";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#888",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen name="Trade" component={DemoTradeStackScreen} />
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} setUser={setUser} navigation={navigation} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const RootStack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    // Listen for Firebase Auth user state changes
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      if (currentUser) {
        // Optionally, you can fetch user profile data from Firestore here
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          // Add more fields if you fetch them from Firestore
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  if (loadingAuth) return null; // or a splash/loading indicator

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <>
              <RootStack.Screen name="MainTabs">
                {props => <MainTabs {...props} setUser={setUser} />}
              </RootStack.Screen>
              <RootStack.Screen
                name="KycStack"
                component={KycStackScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <RootStack.Screen name="SignIn">
                {props => <SignInScreen {...props} setUser={setUser} />}
              </RootStack.Screen>
              <RootStack.Screen name="SignUp">
                {props => <SignUpScreen {...props} setUser={setUser} />}
              </RootStack.Screen>
            </>
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}