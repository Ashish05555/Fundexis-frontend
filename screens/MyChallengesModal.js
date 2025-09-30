import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { auth, db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

/**
 * MyChallengesScreen
 * - Replaces the modal with a full, scrollable screen.
 * - Removes P&L, Trades, and "Frozen day ..." line.
 * - Phase 1 & Phase 2:
 *    • Target (left) = 10% of challenge size
 *    • Max Loss (right) = 10% of challenge size
 * - Funded Accounts:
 *    • No Target (left empty)
 *    • Max Loss (right) = 10% of funded account size
 */
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

  const { phase1, phase2, funded } = useMemo(() => {
    const p1 = [];
    const p2 = [];
    const fn = [];
    for (const ch of challenges) {
      if (isFunded(ch)) fn.push(ch);
      else if (isPhase2(ch)) p2.push(ch);
      else p1.push(ch);
    }
    return { phase1: p1, phase2: p2, funded: fn };
  }, [challenges]);

  const phase1Count = phase1.length;
  const phase2Count = phase2.length;
  const fundedCount = funded.length;
  const totalActive = phase1Count + phase2Count + fundedCount;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{totalActive} Active Challenges</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary pills */}
      <View style={styles.pillsRow}>
        <Pill>{phase1Count} Phase 1</Pill>
        <Pill>{phase2Count} Phase 2</Pill>
        <Pill>{fundedCount} Funded</Pill>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color="#3246FF" />
            <Text style={styles.loadingText}>Loading your challenges…</Text>
          </View>
        ) : (
          <>
            {/* Phase 1 */}
            <SectionTitle>Phase 1 Challenges</SectionTitle>
            {phase1.length === 0 ? (
              <Empty>No Phase 1 challenges yet</Empty>
            ) : (
              phase1.map((ch) => (
                <ChallengeRow key={ch.id} challenge={ch} showTarget showMaxLoss isFunded={false} />
              ))
            )}

            {/* Phase 2 */}
            <SectionTitle>Phase 2 Challenges</SectionTitle>
            {phase2.length === 0 ? (
              <Empty>No Phase 2 challenges yet</Empty>
            ) : (
              phase2.map((ch) => (
                <ChallengeRow key={ch.id} challenge={ch} showTarget showMaxLoss isFunded={false} />
              ))
            )}

            {/* Funded Accounts */}
            <SectionTitle>Funded Accounts</SectionTitle>
            {funded.length === 0 ? (
              <Empty>No funded accounts yet</Empty>
            ) : (
              funded.map((ch) => (
                <ChallengeRow key={ch.id} challenge={ch} showTarget={false} showMaxLoss isFunded />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom safe area */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

/* ------------------------------- Row/Card -------------------------------- */

function ChallengeRow({ challenge, showTarget, showMaxLoss, isFunded }) {
  const base = pickBaseAmount(challenge);
  const tenPct = round2(base * 0.1);
  const title = getChallengeTitle(challenge, base);
  const status = deriveStatus(challenge);

  return (
    <View style={styles.card}>
      {/* Title + status */}
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <View style={[styles.statusPill, status === "FAILED" ? styles.statusFailed : styles.statusActive]}>
          <Text style={status === "FAILED" ? styles.statusFailedText : styles.statusActiveText}>
            {status}
          </Text>
        </View>
      </View>

      {/* Metrics row: Left=Target (if not funded), Right=Max Loss (10%) */}
      <View style={styles.metricsRow}>
        <View style={styles.metricLeft}>
          {showTarget && !isFunded ? (
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

/* -------------------------------- Helpers -------------------------------- */

function isFunded(ch) {
  const t = String(ch?.type || ch?.category || "").toLowerCase();
  const s = String(ch?.status || ch?.phaseStatus || ch?.challengeStatus || "").toLowerCase();
  const phase = (ch?.phase ?? ch?.phaseNumber ?? ch?.phase_name ?? "").toString().toLowerCase();
  return t.includes("funded") || s.includes("funded") || phase.includes("funded") || phase === "funded" || ch?.isFunded === true;
}
function isPhase2(ch) {
  const phase = (ch?.phase ?? ch?.phaseNumber ?? ch?.phase_name ?? "").toString().toLowerCase();
  return phase === "2" || phase === "phase 2" || phase.includes("2");
}
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
  const suffix = String(ch?.id || ch?.docId || ch?.challengeId || "").slice(-5);
  const lakh = base >= 100000 ? Math.round(base / 100000) : 0;
  if (lakh > 0) return `${lakh} Lakh Challenge #${suffix || ""}`.trim();
  return `Challenge #${suffix || ""}`.trim();
}
function deriveStatus(ch) {
  const s = String(ch?.status || ch?.phaseStatus || ch?.challengeStatus || ch?.state || "").toLowerCase();
  if (["failed", "breached", "breach", "closed", "terminated", "rejected"].some((x) => s.includes(x))) return "FAILED";
  return "ACTIVE";
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
    backgroundColor: "#F7F8FA",
  },
  header: {
    height: 52,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E6E8EF",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  pillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4FF",
    borderWidth: 1,
    borderColor: "#E4E7FF",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#243BFF",
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2A2F45",
    marginTop: 8,
    marginBottom: 6,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    color: "#6B7280",
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#4B5563",
  },
  card: {
    borderWidth: 1,
    borderColor: "#E6E8EF",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#D7DEFF",
  },
  statusActiveText: {
    color: "#233BFF",
    fontSize: 10,
    fontWeight: "800",
  },
  statusFailed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  statusFailedText: {
    color: "#B91C1C",
    fontSize: 10,
    fontWeight: "800",
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
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#6B7280",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});

/* --------------------------- Small Presenters ---------------------------- */
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
function Empty({ children }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children}</Text>
    </View>
  );
}