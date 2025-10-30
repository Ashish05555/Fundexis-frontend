import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const PHASE_TABS = [
  { key: "phase1", label: "Phase 1" },
  { key: "phase2", label: "Phase 2" },
  { key: "funded", label: "Funded" },
];

export default function MyChallengesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const routeUid = route?.params?.userId;
  const fallbackUid = auth?.currentUser?.uid || null;
  const userId = routeUid || fallbackUid;

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);

  // Tab state: default to "phase1"
  const [activeTab, setActiveTab] = useState("phase1");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!userId) {
        setChallenges([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, `users/${userId}/challenges`));
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (isMounted) setChallenges(rows);
      } catch (e) {
        console.log("MyChallengesScreen load error:", e?.message || e);
        if (isMounted) setChallenges([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [userId]);

  // Buckets strictly by phase field
  const { phase1, phase2, funded } = useMemo(() => {
    const p1 = [], p2 = [], fn = [];
    for (const ch of challenges) {
      const phase = normalizePhase(ch?.phase);
      if (phase === "funded") fn.push(ch);
      else if (phase === "2") p2.push(ch);
      else p1.push(ch); // default: Phase 1 if unknown
    }
    return { phase1: p1, phase2: p2, funded: fn };
  }, [challenges]);

  const phase1Count = phase1.length;
  const phase2Count = phase2.length;
  const fundedCount = funded.length;
  const totalActive = phase1Count + phase2Count + fundedCount;

  // Tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#1740FF" />
          <Text style={styles.loadingText}>Loading your challenges…</Text>
        </View>
      );
    }
    if (activeTab === "phase1") {
      return (
        <>
          <SectionTitle>Phase 1 Challenges</SectionTitle>
          {phase1.length === 0 ? (
            <EmptyState>No Phase 1 challenges yet</EmptyState>
          ) : (
            <View style={styles.cardsStack}>
              {phase1.map((ch) => (
                <ChallengeCard key={ch.id} challenge={ch} phase="1" />
              ))}
            </View>
          )}
        </>
      );
    }
    if (activeTab === "phase2") {
      return (
        <>
          <SectionTitle>Phase 2 Challenges</SectionTitle>
          {phase2.length === 0 ? (
            <EmptyState>No Phase 2 challenges yet</EmptyState>
          ) : (
            <View style={styles.cardsStack}>
              {phase2.map((ch) => (
                <ChallengeCard key={ch.id} challenge={ch} phase="2" />
              ))}
            </View>
          )}
        </>
      );
    }
    if (activeTab === "funded") {
      return (
        <>
          <SectionTitle>Funded Accounts</SectionTitle>
          {funded.length === 0 ? (
            <EmptyState>No funded accounts yet</EmptyState>
          ) : (
            <View style={styles.cardsStack}>
              {funded.map((ch) => (
                <ChallengeCard key={ch.id} challenge={ch} phase="funded" />
              ))}
            </View>
          )}
        </>
      );
    }
    return null;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color="#0E1C47" />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {totalActive} Active Challenges
          </Text>
        </View>
      </View>

      {/* Phase Tabs (clickable) */}
      <View style={styles.tabsRow}>
        <TabButton
          label={`${phase1Count} Phase 1`}
          active={activeTab === "phase1"}
          onPress={() => setActiveTab("phase1")}
        />
        <TabButton
          label={`${phase2Count} Phase 2`}
          active={activeTab === "phase2"}
          onPress={() => setActiveTab("phase2")}
        />
        <TabButton
          label={`${fundedCount} Funded`}
          active={activeTab === "funded"}
          onPress={() => setActiveTab("funded")}
        />
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>
    </View>
  );
}

/* -------------------------------- TabButton -------------------------------- */
function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* -------------------------------- Challenge Card -------------------------------- */
function ChallengeCard({ challenge, phase }) {
  // Get correct base amount and calculate proper target/max loss
  const baseAmount = getCorrectBaseAmount(challenge);
  const targetAmount = baseAmount * 0.1; // 10% of base amount
  const maxLossAmount = baseAmount * 0.1; // 10% of base amount

  const title = getChallengeTitle(challenge, baseAmount);
  const displayStatus = getDisplayStatusForPhase(phase, challenge);

  const statusConfig = getStatusConfig(displayStatus);

  return (
    <View style={styles.challengeCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.challengeTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statusBadge, statusConfig.style]}>
          <Text style={statusConfig.textStyle}>{displayStatus}</Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        {phase !== "funded" && (
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>TARGET:</Text>
            <Text style={styles.metricValue}>{formatCurrency(targetAmount)}</Text>
          </View>
        )}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>MAX LOSS:</Text>
          <Text style={styles.metricValue}>{formatCurrency(maxLossAmount)}</Text>
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

function getCorrectBaseAmount(challenge) {
  // Use the same logic as ChallengeContext to get correct amounts
  const templateId = challenge?.templateId || "1";

  if (templateId === "1") {
    return 100000; // 1 Lakh Challenge
  } else if (templateId === "2") {
    return 500000; // 5 Lakh Challenge  
  } else if (templateId === "3") {
    return 1000000; // 10 Lakh Challenge
  }

  // Fallback to existing logic
  const candidates = [
    challenge?.accountSize,
    challenge?.challengeSize,
    challenge?.initialBalance,
    challenge?.startingBalance,
    challenge?.baseAmount,
    challenge?.balance,
    challenge?.size,
    challenge?.amount,
    challenge?.maxDrawdownBase,
  ];

  for (const v of candidates) {
    const n = toNumber(v);
    if (n > 0) return n;
  }

  return 100000; // Default to 1 Lakh
}

function getChallengeTitle(challenge, baseAmount) {
  if (challenge?.title) return challenge.title;

  const code = String(challenge?.code || challenge?.challengeCode || challenge?.accountNumber || challenge?.id || "").slice(-5);
  const lakh = baseAmount >= 100000 ? Math.round(baseAmount / 100000) : 0;

  if (lakh > 0) return `${lakh} Lakh Challenge #${code || ""}`.trim();
  return `Challenge #${code || ""}`.trim();
}

function getStatusConfig(status) {
  switch (status) {
    case "ACTIVE":
      return {
        style: { backgroundColor: "#1740FF", borderColor: "#1740FF" },
        textStyle: { color: "#FFFFFF" }
      };
    case "PASSED":
      return {
        style: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
        textStyle: { color: "#166534" }
      };
    case "FAILED":
      return {
        style: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
        textStyle: { color: "#B91C1C" }
      };
    case "BREACHED":
      return {
        style: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
        textStyle: { color: "#B91C1C" }
      };
    default:
      return {
        style: { backgroundColor: "#1740FF", borderColor: "#1740FF" },
        textStyle: { color: "#FFFFFF" }
      };
  }
}

function toNumber(v) {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (isFinite(n)) return n;
  }
  return 0;
}

function formatCurrency(n) {
  const num = typeof n === "number" ? n : toNumber(n);
  try {
    return num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

/* -------------------------------- Presentational Components -------------------------------- */

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function EmptyState({ children }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}

/* -------------------------------- Styles -------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  // Header
  headerBar: {
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerBack: {
    position: "absolute",
    left: 16,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitleWrap: {
    position: "absolute",
    left: 60,
    right: 60,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0E1C47",
    letterSpacing: 0.2,
  },

  // Tabs (row)
  tabsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#DDE3FF",
  },
  tabButtonActive: {
    backgroundColor: "#1740FF",
    borderColor: "#1740FF",
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1740FF",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  // Content
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
  },

  // Loading
  loadingWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E1C47",
    marginBottom: 12,
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Cards
  cardsStack: {
    gap: 12,
  },

  // Challenge Card
  challengeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  challengeTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#0E1C47",
    marginRight: 12,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Metrics
  metricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  metricItem: {
    alignItems: "center",
  },

  metricLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
    letterSpacing: 0.5,
  },

  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0E1C47",
  },
});