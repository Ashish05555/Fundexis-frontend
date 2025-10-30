import "react-native-gesture-handler";
import React, { useEffect, useMemo, useState } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { ChallengeProvider } from "./context/ChallengeContext";
import { LivePriceProvider } from "./context/LivePriceProvider";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  Entypo,
  Feather,
  FontAwesome,
  FontAwesome5,
  AntDesign,
  SimpleLineIcons,
  Octicons,
  EvilIcons,
  Foundation,
  Zocial,
} from "@expo/vector-icons";
import { Asset } from "expo-asset";
import HomeScreen from "./screens/HomeScreen";
import ChallengesScreen from "./screens/ChallengesScreen";
import DemoTradingScreen from "./screens/DemoTradingScreen";
import SearchScreen from "./screens/SearchScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SettingsScreen from "./screens/SettingsScreen";
import OrderScreen from "./screens/OrderScreen";
import InstrumentDetailScreen from "./screens/InstrumentDetailScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";
import KycScreen from "./screens/KycScreen";
import BankAccountScreen from "./screens/BankAccountScreen";
import PayoutScreen from "./screens/PayoutScreen";
import GttOrdersScreen from "./screens/GttOrdersScreen";
import GttOrderForm from "./components/GttOrderForm";
import GttOrderList from "./components/GttOrderList";
import LandingScreen from "./screens/LandingScreen";
import CustomTabBar from "./components/CustomTabBar";
import FAQScreen from "./screens/FAQScreen";
import TermsScreen from "./screens/TermsScreen";
import PrivacyScreen from "./screens/PrivacyScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import PasswordResetScreen from "./screens/PasswordResetScreen";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

// NEW: Payment option and payment method screens
import PaymentOptionsScreen from "./screens/PaymentOptionsScreen";
import RazorpayScreen from "./screens/RazorpayScreen";
import GooglePlayScreen from "./screens/GooglePlayScreen";
import MyChallengesScreen from "./screens/MyChallengesScreen";

if (typeof window !== "undefined") {
  window.auth = auth;
}

async function waitForWebFonts() {
  if (Platform.OS !== "web") return;
  const fams = [
    "Ionicons",
    "Material Icons",
    "MaterialCommunityIcons",
    "Entypo",
    "Feather",
    "FontAwesome",
    "FontAwesome5Free",
    "AntDesign",
    "SimpleLineIcons",
    "Octicons",
    "EvilIcons",
    "Foundation",
    "Zocial",
  ];
  const fonts = (document && document.fonts) || null;
  if (!fonts) return;
  try {
    await fonts.ready;
    const loaders = fams.map((f) =>
      Promise.all([
        fonts.load(`normal 400 18px "${f}"`),
        fonts.load(`normal 400 22px "${f}"`),
        fonts.load(`normal 400 28px "${f}"`),
      ])
    );
    await Promise.all(loaders);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r))
    );
  } catch {}
}

function IconFontWarmup() {
  return (
    <View style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}>
      <Ionicons name="home-outline" size={1} />
      <Ionicons name="trophy-outline" size={1} />
      <Ionicons name="bar-chart-outline" size={1} />
      <Ionicons name="person-circle-outline" size={1} />
      <MaterialCommunityIcons name="cart-outline" size={1} />
      <Feather name="shopping-bag" size={1} />
      <Entypo name="home" size={1} />
      <AntDesign name="home" size={1} />
      <FontAwesome5 name="trophy" size={1} />
      <SimpleLineIcons name="graph" size={1} />
      <Octicons name="graph" size={1} />
      <EvilIcons name="user" size={1} />
      <Foundation name="graph-bar" size={1} />
      <Zocial name="cart" size={1} />
    </View>
  );
}

function HeaderBack({ navigation }) {
  return (
    <TouchableOpacity
      style={{ paddingLeft: 16, paddingVertical: 4 }}
      onPress={() => navigation.goBack()}
    >
      <Text style={{ fontSize: 24, color: "#222" }}>{"←"}</Text>
    </TouchableOpacity>
  );
}

const DemoTradeStack = createStackNavigator();
function DemoTradeStackScreen() {
  return (
    <DemoTradeStack.Navigator>
      <DemoTradeStack.Screen
        name="DemoTrading"
        component={DemoTradingScreen}
        options={{ headerShown: false }}
      />
      <DemoTradeStack.Screen
        name="SearchScreen"
        component={SearchScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Search instrument",
          headerLeft: () => <HeaderBack navigation={navigation} />,
        })}
      />
      <DemoTradeStack.Screen
        name="InstrumentDetailScreen"
        component={InstrumentDetailScreen}
        options={{ title: "Instrument Details" }}
      />
      <DemoTradeStack.Screen
        name="OrderScreen"
        component={OrderScreen}
        options={{ title: "Order" }}
      />
      <DemoTradeStack.Screen
        name="GttOrdersScreen"
        component={GttOrdersScreen}
        options={{ title: "GTT Orders" }}
      />
      <DemoTradeStack.Screen
        name="GttOrderForm"
        component={GttOrderForm}
        options={{ title: "Create GTT" }}
      />
      <DemoTradeStack.Screen
        name="GttOrderList"
        component={GttOrderList}
        options={{ title: "GTT History" }}
      />
    </DemoTradeStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();
function MainTabs({ setUser }) {
  const tabIconMap = useMemo(
    () => ({
      Home: { active: "home", inactive: "home-outline" },
      Challenges: { active: "trophy", inactive: "trophy-outline" },
      Trade: { active: "bar-chart", inactive: "bar-chart-outline" },
      Profile: { active: "person-circle", inactive: "person-circle-outline" },
    }),
    []
  );
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={({ route }) => ({
        headerShown: false,
        lazy: false,
        detachInactiveScreens: false,
        tabBarIcon: ({ color, size, focused }) => {
          const pair = tabIconMap[route.name];
          const name = pair
            ? focused
              ? pair.active
              : pair.inactive
            : focused
            ? "ellipse"
            : "ellipse-outline";
          return (
            <Ionicons name={name} size={size ?? 22} color={color ?? "#1740FF"} />
          );
        },
        tabBarActiveTintColor: "#1740FF",
        tabBarInactiveTintColor: "#8aa0ff",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Challenges" component={ChallengesScreen} />
      <Tab.Screen name="Trade" component={DemoTradeStackScreen} />
      <Tab.Screen name="Profile">
        {(props) => <ProfileScreen {...props} setUser={setUser} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const RootStack = createStackNavigator();

function AppContainer() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const { theme } = useTheme();

  // --- DEBUG: Track user state changes ---
  useEffect(() => {
    console.log("🟣 App.js: user state changed:", user);
  }, [user]);
  // --- END DEBUG ---

  useEffect(() => {
    const landingTimeout = setTimeout(() => setShowLanding(false), 1200);
    return () => clearTimeout(landingTimeout);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (
          !currentUser.emailVerified &&
          currentUser.providerData[0]?.providerId === "password"
        ) {
          await signOut(auth);
          setUser(null);
          setLoadingAuth(false);
          return;
        }

        const userDocRef = doc(db, "users", currentUser.uid);
        let userData = {};
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) userData = userDoc.data();
        } catch {}
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          ...userData,
        });
      } else {
        setUser(null);
      }
      setLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  if (loadingAuth || showLanding) {
    return <LandingScreen />;
  }

  const navigationTheme =
    theme && theme.mode === "dark"
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: theme.background,
            card: theme.card,
            border: theme.border,
            text: theme.text,
            primary: theme.brand,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: theme?.background || DefaultTheme.colors.background,
            card: theme?.card || DefaultTheme.colors.card,
            border: theme?.border || DefaultTheme.colors.border,
            text: theme?.text || DefaultTheme.colors.text,
            primary: theme?.brand || DefaultTheme.colors.primary,
          },
        };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ChallengeProvider>
        <LivePriceProvider>
          <NavigationContainer
            theme={navigationTheme}
            onStateChange={(state) => {
              const getActiveRouteName = (navState) => {
                if (!navState) return null;
                const route = navState.routes[navState.index];
                if (route.state) return getActiveRouteName(route.state);
                return route.name;
              };
              // eslint-disable-next-line no-console
              console.error("NAV Route:", getActiveRouteName(state));
            }}
          >
            <IconFontWarmup />
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (
                <>
                  <RootStack.Screen
                    name="MainTabs"
                    children={(props) => (
                      <MainTabs {...props} setUser={setUser} />
                    )}
                  />

                  {/* NEW: Payment screens */}
                  <RootStack.Screen
                    name="PaymentOptionsScreen"
                    component={PaymentOptionsScreen}
                  />
                  <RootStack.Screen
                    name="RazorpayScreen"
                    component={RazorpayScreen}
                  />
                  <RootStack.Screen
                    name="GooglePlayScreen"
                    component={GooglePlayScreen}
                  />

                  {/* Registered: MyChallenges screen (accessible from HomeScreen) */}
                  <RootStack.Screen
                    name="MyChallenges"
                    component={MyChallengesScreen}
                    options={{ headerShown: false }}
                  />

                  <RootStack.Screen
                    name="KycScreen"
                    component={KycScreen}
                  />
                  <RootStack.Screen
                    name="BankAccountScreen"
                    component={BankAccountScreen}
                  />
                  <RootStack.Screen
                    name="PayoutScreen"
                    component={PayoutScreen}
                  />
                  <RootStack.Screen
                    name="SettingsScreen"
                    component={SettingsScreen}
                  />
                  <RootStack.Screen name="FAQScreen" component={FAQScreen} />
                  <RootStack.Screen
                    name="TermsScreen"
                    component={TermsScreen}
                  />
                  <RootStack.Screen
                    name="PrivacyScreen"
                    component={PrivacyScreen}
                  />
                </>
              ) : (
                <>
                  <RootStack.Screen
                    name="SignIn"
                    children={(props) => (
                      <SignInScreen {...props} setUser={setUser} />
                    )}
                  />
                  <RootStack.Screen
                    name="SignUp"
                    children={(props) => (
                      <SignUpScreen {...props} setUser={setUser} />
                    )}
                  />
                  <RootStack.Screen
                    name="ForgotPassword"
                    component={ForgotPasswordScreen}
                  />
                  <RootStack.Screen
                    name="PasswordReset"
                    component={PasswordResetScreen}
                  />
                </>
              )}
            </RootStack.Navigator>
          </NavigationContainer>
        </LivePriceProvider>
      </ChallengeProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...Entypo.font,
    ...Feather.font,
    ...FontAwesome.font,
    ...FontAwesome5.font,
    ...AntDesign.font,
    ...SimpleLineIcons.font,
    ...Octicons.font,
    ...EvilIcons.font,
    ...Foundation.font,
    ...Zocial.font,
  });

  const [assetsReady, setAssetsReady] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => {});
    return () => {
      SplashScreen.hideAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Promise.all([
          Asset.fromModule(require("./assets/app-icon.png")).downloadAsync(),
        ]);
      } catch {
        // ignore
      } finally {
        if (mounted) setAssetsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!fontsLoaded || !assetsReady) return;
      await waitForWebFonts();
      if (!cancelled) {
        setAppReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fontsLoaded, assetsReady]);

  if (!appReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color="#1740FF" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContainer />
    </ThemeProvider>
  );
}