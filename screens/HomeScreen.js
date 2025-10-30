import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useRestLivePrices from "../hooks/useRestLivePrices";

const BRAND_BLUE = "#1740FF";
const BRAND_GRADIENT = ["#1740FF", "#0F2FCC"];
const LIGHT_BLUE = "#F7F9FF";
const WHITE = "#FFFFFF";
const GREEN = "#16A34A";
const RED = "#EF4444";
const OFF_WHITE = "#F9FAFB";
const DARK_BORDER = "#0F2FCC";

// Update these to your actual tokens for NIFTY 50 and BANKNIFTY
const NIFTY_TOKEN = "256265";
const BANKNIFTY_TOKEN = "260105";

export default function HomeScreen({ navigation }) {
  const [userProfile, setUserProfile] = useState({ name: "Trader" });
  const [currentUid, setCurrentUid] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  // Live prices hook, polling every 1 second
  const prices = useRestLivePrices([NIFTY_TOKEN, BANKNIFTY_TOKEN], 1000);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setCurrentUid(user.uid);
          const snap = await getDoc(doc(db, "users", user.uid));
          const data = snap.exists() ? snap.data() : {};
          const userName = data?.name || user.displayName || "Trader";
          setUserProfile({ name: userName });
          await fetchChallenges(user.uid);
        } else {
          setCurrentUid(null);
          setUserProfile({ name: "Trader" });
          setChallenges([]);
          setLoadingChallenges(false);
        }
      } catch {
        setCurrentUid(null);
        setUserProfile({ name: "Trader" });
        setChallenges([]);
        setLoadingChallenges(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchChallenges = async (userId) => {
    if (!userId) {
      setChallenges([]);
      setLoadingChallenges(false);
      return;
    }
    setLoadingChallenges(true);
    try {
      const snap = await getDocs(collection(db, `users/${userId}/challenges`));
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChallenges(rows);
    } catch (e) {
      console.log("HomeScreen fetchChallenges error:", e?.message || e);
      setChallenges([]);
    } finally {
      setLoadingChallenges(false);
    }
  };

  // Calculate challenge counts based on actual data
  const { activeCount, passedCount, failedCount } = React.useMemo(() => {
    let active = 0, passed = 0, failed = 0;
    for (const challenge of challenges) {
      const phase = normalizePhase(challenge?.phase);
      const status = getDisplayStatusForPhase(phase, challenge);
      if (phase !== "funded") {
        if (status === "ACTIVE") active++;
        else if (status === "PASSED") passed++;
        else if (status === "FAILED" || status === "BREACHED") failed++;
      }
    }
    return { activeCount: active, passedCount: passed, failedCount: failed };
  }, [challenges]);

  const name = userProfile?.name || "Trader";

  // Get market details from live prices
  const nifty = prices[NIFTY_TOKEN] || {};
  const banknifty = prices[BANKNIFTY_TOKEN] || {};

  // Helper for up/down color/arrow and percent change
  function getMarketStats(item) {
    // Use last_price and close/ohlc.close as per backend
    const price =
      typeof item.last_price === "number" ? item.last_price :
      typeof item.price === "number" ? item.price : null;

    // Accept either close or ohlc.close for prevClose
    const prevClose =
      typeof item.close === "number" ? item.close :
      item && item.ohlc && typeof item.ohlc.close === "number" ? item.ohlc.close :
      null;

    if (price === null) {
      // fallback for missing data
      return {
        price: null,
        percent: "--",
        arrow: "↓",
        color: RED,
        borderStyle: styles.marketCardRed,
        change: "--",
        isUp: false
      };
    }
    let change = "--";
    let percent = "--";
    let isUp = false;
    if (prevClose !== null && prevClose !== 0) {
      change = (price - prevClose).toFixed(2);
      percent = (((price - prevClose) / prevClose) * 100).toFixed(2);
      isUp = price > prevClose;
    }
    return {
      price: price,
      percent: percent,
      arrow: isUp ? "↑" : "↓",
      color: isUp ? GREEN : RED,
      borderStyle: isUp ? styles.marketCardGreen : styles.marketCardRed,
      change: change,
      isUp
    };
  }

  const niftyStats = getMarketStats(nifty);
  const bankniftyStats = getMarketStats(banknifty);

  // ---- MarketTab component, arrow next to label, percentage on third row left side ----
  function MarketTab({ label, stats }) {
    return (
      <View style={[styles.marketCard, stats.borderStyle]}>
        {/* Top Row: Arrow and label */}
        <View style={styles.marketTop}>
          <View style={[
            styles.marketIconWrapper,
            { backgroundColor: `${stats.color}15` }
          ]}>
            <Ionicons
              name={stats.arrow === "↑" ? "trending-up" : "trending-down"}
              size={22}
              color={stats.color}
              style={{ marginRight: 5, marginBottom: -2 }}
            />
          </View>
          <Text style={styles.marketName}>{label}</Text>
        </View>
        {/* Second Row: Price */}
        <Text style={styles.marketPrice}>
          {typeof stats.price === "number"
            ? stats.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })
            : "..."}
        </Text>
        {/* Third Row: left side arrow and percent */}
        <View style={styles.marketChangeRow}>
          <Ionicons
            name={stats.arrow === "↑" ? "arrow-up-sharp" : "arrow-down-sharp"}
            size={18}
            color={stats.color}
            style={{ marginRight: 2 }}
          />
          <Text style={[styles.marketChangeText, { color: stats.color }]}>
            {stats.percent !== "--"
              ? `${stats.isUp ? "+" : ""}${stats.percent}%`
              : "--"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top }
    ]}>
      <ExpoLinearGradient
        colors={BRAND_GRADIENT}
        style={styles.headerBg}
        start={[0, 0]}
        end={[0, 1]}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.userName}>{name}</Text>
        </View>
      </ExpoLinearGradient>

      {/* Main content */}
      <View style={styles.flexGrow}>
        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Trade', { screen: 'DemoTrading', userId: currentUid })}
          >
            <ExpoLinearGradient 
              colors={BRAND_GRADIENT} 
              start={[0, 0]} 
              end={[1, 1]}
              style={styles.actionCard}
            >
              <View style={styles.iconCircle}>
                <Ionicons name="trending-up" size={34} color={WHITE} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Start Trading</Text>
                <Text style={styles.cardSubtitle}>Begin your trading journey</Text>
              </View>
              <Ionicons name="chevron-forward" size={34} color={WHITE} />
            </ExpoLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardWrapper}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Challenges', { userId: currentUid })}
          >
            <ExpoLinearGradient 
              colors={BRAND_GRADIENT} 
              start={[0, 0]} 
              end={[1, 1]}
              style={styles.actionCard}
            >
              <View style={styles.iconCircle}>
                <FontAwesome5 name="shopping-cart" size={32} color={WHITE} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Buy a Challenge</Text>
                <Text style={styles.cardSubtitle}>Get funded today</Text>
              </View>
              <Ionicons name="chevron-forward" size={34} color={WHITE} />
            </ExpoLinearGradient>
          </TouchableOpacity>
        </View>

        {/* Active Challenges Section */}
        <TouchableOpacity
          style={styles.challengesSection}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MyChallenges', { userId: currentUid })}
        >
          <View style={styles.challengesHeader}>
            <MaterialCommunityIcons name="chart-box" size={24} color={BRAND_BLUE} style={styles.challengesIcon} />
            <Text style={styles.challengesTitle}>Active Challenges</Text>
            <Ionicons name="chevron-forward" size={22} color="#6B7280" />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <Text style={[styles.statValue, { color: BRAND_BLUE }]} aria-label="Active challenges count">
                {loadingChallenges ? "..." : activeCount}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statLabel]}>PASSED</Text>
              <Text style={[styles.statValue, { color: GREEN }]} aria-label="Passed challenges count">
                {loadingChallenges ? "..." : passedCount}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>FAILED</Text>
              <Text style={[styles.statValue, { color: RED }]} aria-label="Failed challenges count">
                {loadingChallenges ? "..." : failedCount}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Market Overview */}
        <View style={styles.marketSection}>
          <Text style={styles.sectionTitle}>Market Overview</Text>
          <View style={styles.marketRow}>
            <MarketTab label="NIFTY 50" stats={niftyStats} />
            <MarketTab label="BANK NIFTY" stats={bankniftyStats} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* -------------------------------- Helper Functions -------------------------------- */

function normalizePhase(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "2" || s === "phase 2" || s.includes("phase 2") || raw === 2) return "2";
  if (s === "funded") return "funded";
  return "1";
}

function getDisplayStatusForPhase(phase, ch) {
  const tokens = [
    ch?.status,
    ch?.phaseStatus,
    ch?.challengeStatus,
    ch?.state,
    ch?.result,
    ch?.verdict,
    ch?.reason,
    ch?.violation,
  ].filter(Boolean).map(v => String(v).toLowerCase());

  const text = tokens.join(" | ");
  const has = (arr) => arr.some(m => text.includes(m));

  const passed = ["passed","pass","completed","complete","target hit","target_hit","target achieved","approved","cleared","success"];
  const breached = ["breached","breach","max loss","max_loss","drawdown","dd breach","violation","rule broken"];
  const failed = ["failed","fail","terminated","rejected","closed"];

  if (phase === "funded") {
    if (has(breached) || has(failed)) return "BREACHED";
    return "ACTIVE";
  }
  if (has(passed)) return "PASSED";
  if (has(breached) || has(failed)) return "FAILED";
  return "ACTIVE";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_BLUE,
    justifyContent: 'flex-start',
    paddingBottom: 0,
  },
  headerBg: {
    width: "100%",
    height: 120,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "flex-end",
    alignItems: "flex-start",
  },
  flexGrow: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 22,
    zIndex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    zIndex: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: WHITE,
    marginBottom: 2,
  },
  userName: {
    fontSize: 38,
    fontWeight: '700',
    color: WHITE,
    letterSpacing: 0.3,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  cardWrapper: {
    marginBottom: 15,
    borderRadius: 14,
    ...Platform.select({
      ios: {
        shadowColor: BRAND_BLUE,
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 110,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: WHITE,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  challengesSection: {
    marginHorizontal: 16,
    backgroundColor: OFF_WHITE,
    borderRadius: 12,
    padding: 18,
    marginBottom: 10,
    borderWidth: 2.5,
    borderColor: DARK_BORDER,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.09,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  challengesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  challengesIcon: {
    marginRight: 10,
  },
  challengesTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: BRAND_BLUE,
  },
  marketSection: {
    marginTop: 0,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  marketRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 0,
  },
  marketCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    minHeight: 110,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.07,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  marketCardGreen: {
    borderColor: GREEN,
  },
  marketCardRed: {
    borderColor: RED,
  },
  marketTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: `${GREEN}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  marketName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
    flexDirection: "row",
    alignItems: "center"
  },
  marketPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  marketChangeText: {
    fontSize: 15,
    fontWeight: '700',
    color: GREEN,
  },
  marketChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 4,
  },
});