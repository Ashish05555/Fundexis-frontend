import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  bg: "#F6F7FB",
  card: "#FFFFFF",
  border: "#E6E8EF",
  title: "#0E1C47",
  section: "#24355E",
  label: "#7A839A",
  value: "#0F172A",
  pillBg: "#F3F4FF",
  pillBorder: "#DDE3FF",
  pillText: "#2440FF",
  activeBg: "#2440FF",
  activeBorder: "#1F37E4",
  activeText: "#FFFFFF",
  passedBg: "#DCFCE7",
  passedBorder: "#86EFAC",
  passedText: "#166534",
  failedBg: "#FEE2E2",
  failedBorder: "#FECACA",
  failedText: "#B91C1C",
  breachedBg: "#FEE2E2",
  breachedBorder: "#FECACA",
  breachedText: "#B91C1C",
  muted: "#6B7280",
};

export default function MyChallengesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const routeUid = route?.params?.userId;
  const fallbackUid = auth?.currentUser?.uid || null;
  const userId = routeUid || fallbackUid;

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);

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

  // Buckets strictly by phase field. We never auto-move.
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header: back extreme left, title centered */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.title} />
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {totalActive} Active Challenges
          </Text>
        </View>
      </View>

      {/* Pills */}
      <View style={styles.pillsRow}>
        <Pill>{phase1Count} Phase 1</Pill>
        <Pill>{phase2Count} Phase 2</Pill>
        <Pill>{fundedCount} Funded</Pill>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={COLORS.pillText} />
            <Text style={styles.loadingText}>Loading your challenges…</Text>
          </View>
        ) : (
          <>
            <SectionTitle>Phase 1 Challenges</SectionTitle>
            {phase1.length === 0 ? (
              <EmptyLine>No Phase 1 challenges yet</EmptyLine>
            ) : (
              <View style={styles.cardsStack}>
                {phase1.map((ch) => (
                  <ChallengeCard key={ch.id} challenge={ch} phase="1" />
                ))}
              </View>
            )}

            <SectionTitle>Phase 2 Challenges</SectionTitle>
            {phase2.length === 0 ? (
              <EmptyLine>No Phase 2 challenges yet</EmptyLine>
            ) : (
              <View style={styles.cardsStack}>
                {phase2.map((ch) => (
                  <ChallengeCard key={ch.id} challenge={ch} phase="2" />
                ))}
              </View>
            )}

            <SectionTitle>Funded Accounts</SectionTitle>
            {funded.length === 0 ? (
              <EmptyLine>No funded accounts yet</EmptyLine>
            ) : (
              <View style={styles.cardsStack}>
                {funded.map((ch) => (
                  <ChallengeCard key={ch.id} challenge={ch} phase="funded" />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* -------------------------------- Card -------------------------------- */

function ChallengeCard({ challenge, phase }) {
  const base = pickBaseAmount(challenge);
  const tenPct = round2(base * 0.1);
  const title = getChallengeTitle(challenge, base);

  // Compute the display status according to your rules
  const displayStatus = getDisplayStatusForPhase(phase, challenge);

  const statusStyle =
    displayStatus === "BREACHED" ? styles.statusBreached :
    displayStatus === "FAILED"   ? styles.statusFailed   :
    displayStatus === "PASSED"   ? styles.statusPassed   :
                                   styles.statusActive;

  const statusTextStyle =
    displayStatus === "BREACHED" ? styles.statusBreachedText :
    displayStatus === "FAILED"   ? styles.statusFailedText   :
    displayStatus === "PASSED"   ? styles.statusPassedText   :
                                   styles.statusActiveText;

  // Visibility of metrics per phase
  const showTarget = phase !== "funded"; // Phase 1/2 show target 10%
  const showMaxLoss = true;              // All phases show Max Loss 10%; funded shows only max loss

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statusPill, statusStyle]}>
          <Text style={statusTextStyle}>{displayStatus}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricLeft}>
          {showTarget ? (
            <>
              <Text style={styles.metricLabel}>Target:</Text>
              <Text style={styles.metricValue}>{formatINR(tenPct)}</Text>
            </>
          ) : (
            <Text style={[styles.metricLabel, { color: "transparent" }]}>.</Text>
          )}
        </View>
        {showMaxLoss && (
          <View style={styles.metricRight}>
            <Text style={styles.metricLabel}>Max Loss:</Text>
            <Text style={styles.metricValue}>{formatINR(tenPct)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/* ------------------------------ Status logic ----------------------------- */

function normalizePhase(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "2" || s === "phase 2" || s.includes("phase 2") || raw === 2) return "2";
  if (s === "funded") return "funded";
  return "1";
}

// Map DB statuses/notes to a unified label per phase
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
    // Funded shows only Active or Breached
    if (has(breached) || has(failed)) return "BREACHED";
    return "ACTIVE";
  }

  // Phase 1/2: Active, Passed, Failed (breaches count as Failed here)
  if (has(passed)) return "PASSED";
  if (has(breached) || has(failed)) return "FAILED";
  return "ACTIVE";
}

/* -------------------------------- Helpers -------------------------------- */

function pickBaseAmount(ch) {
  const candidates = [
    ch?.accountSize,
    ch?.challengeSize,
    ch?.initialBalance,
    ch?.startingBalance,
    ch?.baseAmount,
    ch?.balance,
    ch?.size,
    ch?.amount,
    ch?.maxDrawdownBase,
  ];
  for (const v of candidates) {
    const n = toNumber(v);
    if (n > 0) return n;
  }
  return 0;
}

function getChallengeTitle(ch, base) {
  if (ch?.title) return ch.title;
  // Fallback title: prefer an explicit code if provided
  const code = String(ch?.code || ch?.challengeCode || ch?.id || "").slice(-5);
  const lakh = base >= 100000 ? Math.round(base / 100000) : 0;
  if (lakh > 0) return `${lakh} Lakh Challenge #${code || ""}`.trim();
  return `Challenge #${code || ""}`.trim();
}

function toNumber(v) {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (isFinite(n)) return n;
  }
  return 0;
}
function round2(x) {
  return Math.round((Number(x) || 0) * 100) / 100;
}
function formatINR(n) {
  const num = typeof n === "number" ? n : toNumber(n);
  try {
    return num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  } catch {
    return `₹${num.toFixed(2)}`;
  }
}

/* -------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header: back absolute left; title centered regardless of back width
  headerBar: {
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerBack: {
    position: "absolute",
    left: 12,
    top: 10,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1F9",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  headerTitleWrap: {
    position: "absolute",
    left: 56,
    right: 56,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "900",
    color: COLORS.title,
    letterSpacing: 0.2,
  },

  pillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.pillBg,
    borderWidth: 1,
    borderColor: COLORS.pillBorder,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.pillText,
  },

  scroll: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    gap: 12,
  },

  sectionTitle: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    color: COLORS.section,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 6,
  },

  emptyLine: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    backgroundColor: "#F8FAFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
  },

  cardsStack: {
    gap: 12,
    paddingHorizontal: 4,
  },

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.045, shadowRadius: 10, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 2 },
    }),
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    color: "#162D6B",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: COLORS.activeBg,
    borderColor: COLORS.activeBorder,
  },
  statusActiveText: {
    color: COLORS.activeText,
    fontSize: 11,
    fontWeight: "900",
  },
  statusPassed: {
    backgroundColor: COLORS.passedBg,
    borderColor: COLORS.passedBorder,
  },
  statusPassedText: {
    color: COLORS.passedText,
    fontSize: 11,
    fontWeight: "900",
  },
  statusFailed: {
    backgroundColor: COLORS.failedBg,
    borderColor: COLORS.failedBorder,
  },
  statusFailedText: {
    color: COLORS.failedText,
    fontSize: 11,
    fontWeight: "900",
  },
  statusBreached: {
    backgroundColor: COLORS.breachedBg,
    borderColor: COLORS.breachedBorder,
  },
  statusBreachedText: {
    color: COLORS.breachedText,
    fontSize: 11,
    fontWeight: "900",
  },

  metricsRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  metricRight: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  metricLabel: {
    fontSize: 11,
    lineHeight: 15,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: COLORS.label,
  },
  metricValue: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
    color: COLORS.value,
  },
});

/* ---------------- Small presentational components ---------------- */
function Pill({ children }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{children}</Text>
    </View>
  );
}
function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}
function EmptyLine({ children }) {
  return (
    <View style={styles.emptyLine}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}