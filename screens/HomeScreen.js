import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const BRAND_GRADIENT = ["#2540F6", "#120FD8"];
const ICON_GRADIENT = ["#2540F6", "#6B8CFF"];

// Gaps
const GAP_BETWEEN_DEFAULT = 12;     // desired tidy gap between cards
const GAP_BELOW_HEADER_DEFAULT = 10; // desired small gap under header
const MIN_GAP_BETWEEN = 6;           // minimum allowed gap on tiny screens
const MIN_GAP_BELOW_HEADER = 6;

// Absolute minimum card height to keep content comfortable (fonts unchanged)
const ABS_MIN_CARD_H = 86;

export default function HomeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState({ name: "Trader" }); // show UI immediately
  const [currentUid, setCurrentUid] = useState(null);

  // Measurements
  const [headerH, setHeaderH] = useState(0);
  const insets = useSafeAreaInsets();
  const tabBarHeightRaw = useBottomTabBarHeight?.() ?? 0;
  const tabBarHeight = tabBarHeightRaw > 0 ? tabBarHeightRaw : 60; // safe fallback on web preview
  const { height: winH } = useWindowDimensions();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUid(user.uid);
          const snap = await getDoc(doc(db, "users", user.uid));
          const data = snap.exists() ? snap.data() : {};
          const userName = data?.name || user.displayName || "Trader";
          setUserProfile({ name: userName });
        } else {
          setCurrentUid(null);
          setUserProfile({ name: "Trader" });
        }
      } catch {
        setCurrentUid(null);
        setUserProfile({ name: "Trader" });
      }
    });
    return () => unsub();
  }, []);

  // Compute exact heights so the three cards + gaps fill the screen with no leftover space
  const layout = useMemo(() => {
    // Start with desired gaps
    let gapBetween = GAP_BETWEEN_DEFAULT;
    let gapBelowHeader = GAP_BELOW_HEADER_DEFAULT;

    // We reserve exactly the tab bar area at the bottom (no extra padding so we fill fully)
    const bottomReserve = tabBarHeight + insets.bottom;

    // Fixed vertical parts (top safe area + header + gaps + bottom reserve)
    const fixedTop = insets.top + headerH;
    const fixedGaps = gapBelowHeader + (2 * gapBetween);

    // Space available for the three cards only
    let available = winH - fixedTop - fixedGaps - bottomReserve;

    // If there isn't enough room for comfortable cards, compress the gaps first
    if (available < ABS_MIN_CARD_H * 3) {
      const gapOver =
        (gapBelowHeader - MIN_GAP_BELOW_HEADER) + 2 * (gapBetween - MIN_GAP_BETWEEN);
      const shortage = (ABS_MIN_CARD_H * 3) - available;
      const recover = Math.min(Math.max(0, gapOver), Math.max(0, shortage));

      // Shrink between-gaps first (split across two gaps)
      const canShrinkBetweenTotal = Math.max(0, (gapBetween - MIN_GAP_BETWEEN) * 2);
      const shrinkBetween = Math.min(recover, canShrinkBetweenTotal);
      const perGapReduce = shrinkBetween / 2;
      gapBetween -= perGapReduce;

      // Then shrink the gap below header if needed
      const remaining = recover - shrinkBetween;
      if (remaining > 0) {
        const canShrinkBelow = Math.max(0, gapBelowHeader - MIN_GAP_BELOW_HEADER);
        const shrinkBelow = Math.min(remaining, canShrinkBelow);
        gapBelowHeader -= shrinkBelow;
      }

      // Recompute available after compression
      const fixedGapsNew = gapBelowHeader + (2 * gapBetween);
      available = winH - fixedTop - fixedGapsNew - bottomReserve;
    }

    // Split available height across 3 cards exactly (no leftover whitespace)
    // Distribute remainder pixels to the first cards to sum precisely.
    const base = Math.floor(available / 3);
    let remainder = Math.max(0, Math.round(available - base * 3));
    let h1 = base + (remainder > 0 ? 1 : 0); remainder = Math.max(0, remainder - 1);
    let h2 = base + (remainder > 0 ? 1 : 0); remainder = Math.max(0, remainder - 1);
    let h3 = base; // last gets whatever remains

    // Ensure absolute minima (if base < ABS_MIN_CARD_H for very small screens, allow smaller but keep fonts)
    if (base >= ABS_MIN_CARD_H) {
      h1 = Math.max(ABS_MIN_CARD_H, h1);
      h2 = Math.max(ABS_MIN_CARD_H, h2);
      h3 = Math.max(ABS_MIN_CARD_H, h3);
    }

    return {
      h1: Math.round(h1),
      h2: Math.round(h2),
      h3: Math.round(h3),
      gapBetween: Math.round(gapBetween),
      gapBelowHeader: Math.round(gapBelowHeader),
      bottomReserve: Math.round(bottomReserve),
    };
  }, [winH, insets.top, insets.bottom, headerH, tabBarHeight]);

  const name = userProfile?.name || "Trader";

  return (
    <View style={[styles.bg, { paddingTop: insets.top }]}>
      {/* Header (measured) */}
      <ExpoLinearGradient
        colors={BRAND_GRADIENT}
        start={[0, 0]}
        end={[0, 1]}
        style={styles.headerCurve}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
        <Text style={styles.greetingText}>Welcome,</Text>
        <Text style={styles.userName} numberOfLines={1} allowFontScaling={false}>
          {name}!
        </Text>
      </ExpoLinearGradient>

      {/* Gap under header (compressible on tiny screens) */}
      <View style={{ height: layout.gapBelowHeader }} />

      {/* Cards – keep 90% width, centered */}
      <View style={styles.cardsContainer}>
        {/* Start Trading */}
        <TouchableOpacity
          style={styles.cardWrapper}
          activeOpacity={0.96}
          onPress={() => navigation.navigate('Trade', { screen: 'DemoTrading', userId: currentUid })}
        >
          <ExpoLinearGradient colors={BRAND_GRADIENT} style={[styles.cardGradient, { minHeight: layout.h1 }]}>
            <View style={styles.cardRow}>
              <ExpoLinearGradient colors={ICON_GRADIENT} style={styles.iconCircle}>
                <Ionicons name="trending-up" size={28} color={"#fff"} />
              </ExpoLinearGradient>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1} allowFontScaling={false}>
                  Start Trading
                </Text>
                <Text
                  style={styles.cardSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  allowFontScaling={false}
                >
                  Your trading journey starts here
                </Text>
              </View>
            </View>
          </ExpoLinearGradient>
        </TouchableOpacity>

        {/* Gap between cards */}
        <View style={{ height: layout.gapBetween }} />

        {/* Buy a Challenge */}
        <TouchableOpacity
          style={styles.cardWrapper}
          activeOpacity={0.96}
          onPress={() => navigation.navigate('Challenges', { userId: currentUid })}
        >
          <ExpoLinearGradient colors={["#2C36AD", "#120FD8"]} style={[styles.cardGradient, { minHeight: layout.h2 }]}>
            <View style={styles.cardRow}>
              <ExpoLinearGradient colors={ICON_GRADIENT} style={styles.iconCircle}>
                <FontAwesome5 name="shopping-cart" size={24} color={"#fff"} />
              </ExpoLinearGradient>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1} allowFontScaling={false}>
                  Buy a Challenge
                </Text>
                <Text
                  style={styles.cardSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  allowFontScaling={false}
                >
                  Take on a challenge and get funded
                </Text>
              </View>
            </View>
          </ExpoLinearGradient>
        </TouchableOpacity>

        {/* Gap between cards */}
        <View style={{ height: layout.gapBetween }} />

        {/* My Challenges */}
        <TouchableOpacity
          style={styles.cardWrapper}
          activeOpacity={0.96}
          onPress={() => {
            console.log("My Challenges pressed");
            navigation.navigate('MyChallenges', { userId: currentUid });
          }}
        >
          <ExpoLinearGradient colors={["#3F51B5", "#120FD8"]} style={[styles.cardGradient, { minHeight: layout.h3 }]}>
            <View style={styles.cardRow}>
              <ExpoLinearGradient colors={ICON_GRADIENT} style={styles.iconCircle}>
                <MaterialCommunityIcons name="view-list" size={24} color={"#fff"} />
              </ExpoLinearGradient>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1} allowFontScaling={false}>
                  My Challenges
                </Text>
                <Text
                  style={styles.cardSubtitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  allowFontScaling={false}
                >
                  View your trading challenges
                </Text>
              </View>
            </View>
          </ExpoLinearGradient>
        </TouchableOpacity>
      </View>

      {/* Exact reserve for the tab bar so the three cards end flush at the top of it */}
      <View style={{ height: layout.bottomReserve }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F7F8FA",
    paddingTop: 0,
  },
  headerCurve: {
    width: "100%",
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: 32,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: "flex-start",
    ...Platform.select({
      ios: {
        shadowColor: "#120FD8",
        shadowOpacity: 0.09,
        shadowOffset: { width: 0, height: 7 },
        shadowRadius: 20,
      },
      android: { elevation: 6 },
    }),
  },
  greetingText: {
    fontSize: 22,
    fontWeight: "500",
    color: "#F3F6FF",
    letterSpacing: 0.2,
    marginBottom: 4,
    marginTop: 8,
    opacity: 0.93,
  },
  userName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
    marginTop: 2,
  },
  cardsContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  cardWrapper: {
    width: "90%",
    borderRadius: 22,
    backgroundColor: "transparent",
    ...Platform.select({
      ios: {
        shadowColor: "#120FD833",
        shadowOpacity: 0.17,
        shadowOffset: { width: 0, height: 7 },
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  cardGradient: {
    borderRadius: 22,
    paddingVertical: 10,
    width: "100%",
    justifyContent: "center",
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    width: "100%",
    minHeight: 78,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    backgroundColor: "#2320FA55",
    ...Platform.select({
      ios: {
        shadowColor: "#2540F6",
        shadowOpacity: 0.22,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  cardInfo: {
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: "#E3E6FA",
    fontWeight: "600",
    opacity: 0.95,
    marginTop: 2,
    letterSpacing: 0.01,
    includeFontPadding: false,
    textAlignVertical: "center",
    flexShrink: 1,
    maxWidth: "100%",
  }
});