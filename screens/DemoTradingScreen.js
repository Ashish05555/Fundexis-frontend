import React, { useEffect, useState, useLayoutEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  FlatList,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";
import OrdersTab from "./OrdersTab";
import instrumentsData from "../data/instruments.json";
import useRestLivePrices from "../hooks/useRestLivePrices";
import { useOrderSocket } from "../hooks/useOrderSocket";
import { useLimitOrderExecutor } from "../hooks/useLimitOrderExecutor";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
  collectionGroup,
  updateDoc,
  getDoc,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import ActiveTradeBar from "../components/ActiveTradeBar";
import TradeHistoryCard from "../components/TradeHistoryCard";
import { getTradeEndAtMillis, sortTradesByLatestEnd } from "../utils/tradeHistorySort";
import { formatInstrumentName, buildSearchKeywords, getTwoLineParts } from "../utils/instrumentName";

const SHOW_ACCOUNT_METRICS_IN_SELECTOR = false;
const STATUS_COLORS = {
  ACTIVE: "#22b573",
  BREACHED: "#e53935",
  COMPLETED: "#1976d2",
  CLOSED: "#e66d00",
};
const TAB_ROUTES = [
  { key: "orders", title: "Orders" },
  { key: "active", title: "Active Trades" },
  { key: "history", title: "Trade History" },
];

const MARKET_OPEN_IST = { hour: 9, minute: 15 };
const MARKET_CLOSE_IST = { hour: 15, minute: 30 };
const MIS_SQOFF_MINUTES_BEFORE_CLOSE = 5;

const NSE_RED = "#ef5350";
const BSE_BLUE = "#2D6CDF";

const norm = (s = "") => s.toString().trim().toLowerCase();
const getExchange = (inst = {}) => {
  const raw = (
    inst.exchange ?? inst.exch ?? inst.segment ?? inst.exchSegment ?? ""
  ).toString().toUpperCase();
  if (raw.includes("NFO") || raw.includes("NSE")) return "NSE";
  if (raw.includes("BSE")) return "BSE";
  return raw || "NSE";
};
const getSymbolRaw = (inst = {}) =>
  (inst.tradingsymbol || inst.trading_symbol || inst.symbol || inst.ticker || "").toString();
const getComparableSymbol = (inst = {}) =>
  getSymbolRaw(inst).replace(/[-.](EQ|BE|BL|BZ|PP|SM|XT|XD|XN|XB|MTF|Z)$/i, "");
const getName = (inst = {}) =>
  (inst.display_name || inst.name || inst.companyName || "").toString();
const baseKey = (inst = {}) => {
  const sym = norm(getComparableSymbol(inst));
  const nm = norm(getName(inst));
  return sym || nm.replace(/\s+/g, "");
};

const getExchangeColor = (exchange) => {
  const ex = (exchange || "").toString().toUpperCase();
  if (ex === "NSE") return NSE_RED;
  if (ex === "BSE") return BSE_BLUE;
  return "#666";
};

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function getISTNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 5.5 * 60 * 60 * 1000);
}
function isWithinMISAutoSqOffWindow(istNow, minutesBeforeClose = MIS_SQOFF_MINUTES_BEFORE_CLOSE) {
  const close = new Date(istNow);
  close.setHours(MARKET_CLOSE_IST.hour, MARKET_CLOSE_IST.minute, 0, 0);
  const windowStart = new Date(close.getTime() - minutesBeforeClose * 60 * 1000);
  return istNow >= windowStart && istNow <= close;
}
function isMarketOpenIST(istNow) {
  const open = new Date(istNow);
  open.setHours(MARKET_OPEN_IST.hour, MARKET_OPEN_IST.minute, 0, 0);
  const close = new Date(istNow);
  close.setHours(MARKET_CLOSE_IST.hour, MARKET_CLOSE_IST.minute, 0, 0);
  const day = istNow.getDay();
  const isWeekday = day >= 1 && day <= 5;
  return isWeekday && istNow >= open && istNow <= close;
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
function ymdISTFromEpoch(ms) {
  if (!ms || !Number.isFinite(ms)) return "";
  const d = new Date(ms + IST_OFFSET_MS);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isISTTodayByEndTime(trade) {
  const endMs = getTradeEndAtMillis(trade);
  if (!endMs) return false;
  const todayKey = ymdISTFromEpoch(Date.now());
  return ymdISTFromEpoch(endMs) === todayKey;
}
function tradeSignature(t = {}) {
  return (
    String(t.sourceId || t.id || t.orderId || t.tradeId || t.parentId || "") +
    "|" +
    String(t.tradingsymbol || t.symbol || t.instrumentName || "") +
    "|" +
    String(t.quantity || 0) +
    "|" +
    String(Math.round((t.exitPrice ?? t.closedPrice ?? t.price ?? 0) * 100))
  );
}

function buildSearchIndex(rows = []) {
  return rows.map((inst) => {
    const displayName = formatInstrumentName(inst) || getSymbolRaw(inst);
    const symLower = getSymbolRaw(inst).toLowerCase();
    const nameLower = getName(inst).toLowerCase();
    const dispLower = displayName.toLowerCase();
    const keywords = buildSearchKeywords(inst).map((k) => k.toLowerCase());
    const combined = [symLower, nameLower, dispLower, ...keywords].join(" ");
    const compSym = getComparableSymbol(inst).toLowerCase();
    const exchange = getExchange(inst);
    const tokenStr = String(inst.instrument_token ?? inst.token ?? "");
    return {
      inst,
      displayName,
      symLower,
      nameLower,
      dispLower,
      keywords,
      combined,
      compSym,
      exchange,
      tokenStr,
      baseKey: baseKey(inst),
    };
  });
}
function scoreIndexed(q, row) {
  let score = 0;
  if (!q) return score;
  if (row.dispLower === q) score += 12000;
  else if (row.dispLower.startsWith(q)) score += 7000;
  if (row.compSym === q) score += 11000;
  else if (row.compSym.startsWith(q)) score += 6500;
  if (row.dispLower.includes(q)) score += 1500;
  if (row.symLower.startsWith(q)) score += 2500;
  if (row.nameLower.startsWith(q)) score += 2000;
  if (row.keywords.includes(q)) score += 10500;
  if (row.keywords.some((k) => k.startsWith(q))) score += 3500;
  if (row.keywords.some((k) => k.includes(q))) score += 1100;
  if (q.includes("nse") && row.exchange === "NSE") score += 300;
  if (q.includes("bse") && row.exchange === "BSE") score += 300;
  if (row.compSym) score -= Math.abs(row.compSym.length - q.length) * 2;
  return score;
}
function rankAndFilterIndexed(queryStr, indexed = [], opts = {}) {
  const { limit = 200, preferNSEWithinPair = true } = opts;
  const q = norm(queryStr);
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const filtered = indexed.filter((row) => tokens.every((t) => row.combined.includes(t)));
  if (filtered.length === 0) return [];
  const scored = filtered
    .map((row) => ({ ...row, _score: scoreIndexed(q, row) }))
    .filter((r) => r._score > 0);
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (a.baseKey && b.baseKey && a.baseKey === b.baseKey && preferNSEWithinPair) {
      const ord = (ex) => (ex === "NSE" ? 0 : ex === "BSE" ? 1 : 2);
      const d = ord(a.exchange) - ord(b.exchange);
      if (d !== 0) return d;
    }
    const da = a.displayName.toLowerCase();
    const db = b.displayName.toLowerCase();
    if (da !== db) return da.localeCompare(db);
    return a.baseKey.localeCompare(b.baseKey);
  });
  return scored.slice(0, limit);
}

function tokenForTrade(trade) {
  const tok = trade?.instrument_token;
  if (tok != null) return String(tok);
  const sym = trade?.tradingsymbol || trade?.symbol;
  if (!sym) return undefined;
  const u = String(sym).toUpperCase();
  const inst =
    instrumentsData.find((m) => String(m.tradingsymbol).toUpperCase() === u) ||
    instrumentsData.find((m) => String(m.symbol).toUpperCase() === u);
  return inst?.instrument_token ? String(inst.instrument_token) : undefined;
}
function instByToken(tokenStr) {
  const tokNum = Number(tokenStr);
  return instrumentsData.find((m) => Number(m.instrument_token) === tokNum) || {};
}
function tickForToken(tokenStr) {
  const i = instByToken(tokenStr);
  const t = Number(i?.tick_size);
  return Number.isFinite(t) && t > 0 ? t : 0.05;
}
function roundToTick(px, tick) {
  if (!Number.isFinite(px) || !Number.isFinite(tick) || tick <= 0) return px;
  return Math.round(px / tick) * tick;
}
function getExchangeFromToken(tokenStr) {
  const i = instByToken(tokenStr);
  const exRaw = String(i?.exchange || i?.exch || i?.segment || i?.exchSegment || "").toUpperCase();
  if (exRaw.includes("BSE")) return "BSE";
  return "NSE";
}

function buildExitSnapshot(trades, liveMapByToken = {}) {
  const byToken = new Map();
  for (const t of trades) {
    const tok = tokenForTrade(t) || String(t?.instrument_token || "");
    if (!tok) continue;
    if (!byToken.has(tok)) byToken.set(tok, []);
    byToken.get(tok).push(t);
  }

  const out = new Map();
  for (const [tok, list] of byToken.entries()) {
    const tick = tickForToken(tok);
    const inst = instByToken(tok);

    const fromLiveMap = liveMapByToken[tok];
    const fromTradesLive = list
      .map((t) =>
        typeof t?.liveLtp === "number" && t.liveLtp > 0
          ? t.liveLtp
          : undefined
      )
      .filter((v) => typeof v === "number");
    const fromInst =
      (typeof inst.close === "number" && inst.close > 0 && inst.close) ||
      (typeof inst.last_price === "number" && inst.last_price > 0 && inst.last_price) ||
      undefined;
    const fromEntry =
      list.find((t) => typeof t?.price === "number" && t.price > 0)?.price ?? 0;

    let chosen =
      (typeof fromLiveMap === "number" && fromLiveMap > 0 && fromLiveMap) ||
      (fromTradesLive.length ? fromTradesLive[fromTradesLive.length - 1] : undefined) ||
      fromInst ||
      fromEntry;

    chosen = roundToTick(chosen, tick);
    out.set(tok, { price: chosen, tick, exchange: getExchangeFromToken(tok) });
  }
  return out;
}

export default function DemoTradingScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const {
    selectedChallenge,
    setSelectedChallenge,
    demoAccounts,
    fundedAccounts,
    fetchDemoAccounts,
    fetchFundedAccounts,
  } = useChallenge();

  const [showSelector, setShowSelector] = useState(false);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [closePrices, setClosePrices] = useState({});
  const [marketOpen, setMarketOpen] = useState(false);
  const [tradeTab, setTradeTab] = useState("orders");
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [ordersRefreshSignal, setOrdersRefreshSignal] = useState(0);
  const [fetchError, setFetchError] = useState(null);

  const [resolvedUid, setResolvedUid] = useState(null);
  const [resolvedDocId, setResolvedDocId] = useState(null);
  const [archivedTradeHistory, setArchivedTradeHistory] = useState([]);

  const lastAutoSqoffDateRef = useRef("");

  useEffect(() => {
    try {
      const app = getApp();
      const db = getFirestore();
      const host = (db._settings && db._settings.host) || "";
      const usingEmulator = host.includes("localhost") || host.includes("127.0.0.1");
      console.log("[Trading] Firebase projectId:", app.options.projectId);
      console.log("[Trading] Firestore host:", host || "(default)");
      console.log("[Trading] Using emulator:", usingEmulator);
    } catch (e) {
      console.log("[Trading] Firebase diagnostics error:", e?.message);
    }
  }, []);

  useLayoutEffect(() => {
    if (route?.params?.reopenSearch) {
      const q = route?.params?.searchQuery || "";
      setInstrumentQuery(q);
      setShowSearch(true);
      navigation.setParams?.({ reopenSearch: undefined, searchQuery: undefined });
    }
  }, [route?.params?.reopenSearch]);

  useEffect(() => {
    fetchDemoAccounts();
    if (fetchFundedAccounts) fetchFundedAccounts();
  }, []);

  const allAccounts = useMemo(() => [...demoAccounts, ...(fundedAccounts || [])], [demoAccounts, fundedAccounts]);

  useEffect(() => {
    if (allAccounts.length > 0 && !selectedChallenge) {
      setSelectedChallenge(allAccounts[0]);
    }
  }, [allAccounts, selectedChallenge, setSelectedChallenge]);

  const account = selectedChallenge;

  useEffect(() => {
    const auth = getAuth();
    const authUid = auth?.currentUser?.uid || null;
    const fallbackUid =
      account?.uid ||
      account?.userId ||
      account?.user_id ||
      account?.ownerId ||
      account?.owner_id ||
      null;
    const uid = authUid || fallbackUid || null;
    setResolvedUid(uid);
  }, [account]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setResolvedDocId(null);
      if (!resolvedUid || !account) return;

      const directId =
        account?.docId ||
        account?.challengeDocId ||
        account?._id ||
        account?.id ||
        account?.challengeId ||
        null;

      if (directId) {
        if (!cancelled) setResolvedDocId(directId);
        return;
      }

      const acctNo = account?.accountNumber || account?.fundedAccountNumber || null;
      if (!acctNo) return;

      try {
        const db = getFirestore();
        const cg = query(collectionGroup(db, "challenges"), where("accountNumber", "==", acctNo));
        const snap = await getDocs(cg);
        if (snap.empty) return;

        let chosen = null;
        snap.forEach((d) => {
          const path = d.ref.path;
          if (path.startsWith(`users/${resolvedUid}/challenges/`)) chosen = d;
        });
        const picked = chosen || snap.docs[0];
        const cid = picked.id;
        if (!cancelled) setResolvedDocId(cid);
      } catch (e) {
        console.warn("[Trading] DocId lookup failed:", e?.message);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [resolvedUid, account]);

  useEffect(() => {
    if (!resolvedUid || !resolvedDocId) return;
    const db = getFirestore();
    const ref = doc(db, "users", resolvedUid, "challenges", resolvedDocId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const fresh = { id: resolvedDocId, ...(snap.data() || {}) };
        setSelectedChallenge((prev) => ({ ...(prev || {}), ...fresh }));
      },
      (err) => console.error("[Trading] onSnapshot error:", err)
    );
    return () => unsub();
  }, [resolvedUid, resolvedDocId, setSelectedChallenge]);

  useEffect(() => {
    let unsub = null;
    (async () => {
      const acctNo = account?.accountNumber || account?.fundedAccountNumber || null;
      if (!resolvedUid || resolvedDocId || !acctNo) return;
      try {
        const db = getFirestore();
        const qcg = query(collectionGroup(db, "challenges"), where("accountNumber", "==", acctNo));
        unsub = onSnapshot(qcg, (qs) => {
          let picked = null;
          qs.forEach((d) => {
            if (d.ref.path.startsWith(`users/${resolvedUid}/challenges/`)) picked = d;
          });
          const docSnap = picked || (qs.docs.length ? qs.docs[0] : null);
          if (!docSnap) return;
          const cid = docSnap.id;
          const fresh = { id: cid, ...(docSnap.data() || {}) };
          setSelectedChallenge((prev) => ({ ...(prev || {}), ...fresh }));
        });
      } catch (e) {
        console.warn("[Trading] Fallback subscription error:", e?.message);
        setArchivedTradeHistory([]);
      }
    })();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [resolvedUid, resolvedDocId, account]);

  useEffect(() => {
    if (!resolvedUid || !resolvedDocId) return;
    const db = getFirestore();
    const tradesRef = collection(db, "users", resolvedUid, "challenges", resolvedDocId, "trades");
    const unsub = onSnapshot(
      tradesRef,
      (snap) => {
        setFetchError(null);
        const allTrades = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setActiveTrades(allTrades.filter((trade) => String(trade.status).toUpperCase() === "ACTIVE"));
        setTradeHistory(
          allTrades.filter((trade) => {
            const st = String(trade.status).toUpperCase();
            return st === "COMPLETED" || st === "CLOSED";
          })
        );
      },
      (err) => {
        setFetchError("Error fetching trades: " + err.message);
        setActiveTrades([]);
        setTradeHistory([]);
      }
    );
    return () => unsub();
  }, [resolvedUid, resolvedDocId, ordersRefreshSignal]);

  useEffect(() => {
    if (!resolvedUid || !resolvedDocId) return;
    const db = getFirestore();
    const tradeHistoryRef = collection(db, "users", resolvedUid, "challenges", resolvedDocId, "tradeHistory");
    const unsub = onSnapshot(
      tradeHistoryRef,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setArchivedTradeHistory(rows);
      },
      (err) => {
        console.warn("[TradeHistory] subscription error:", err?.message);
        setArchivedTradeHistory([]);
      }
    );
    return () => unsub();
  }, [resolvedUid, resolvedDocId, ordersRefreshSignal]);

  const searchIndex = useMemo(() => buildSearchIndex(instrumentsData), []);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(instrumentQuery.trim().toLowerCase()), 120);
    return () => clearTimeout(h);
  }, [instrumentQuery]);
  const rankedIndexed = useMemo(
    () => rankAndFilterIndexed(debouncedQuery, searchIndex, { limit: 200, preferNSEWithinPair: true }),
    [debouncedQuery, searchIndex]
  );
  const rankedInstruments = useMemo(() => rankedIndexed.map((r) => r.inst), [rankedIndexed]);

  // ------ USE REST POLLING FOR LIVE PRICES ------
  const visibleTokens = useMemo(
    () =>
      rankedIndexed
        .slice(0, 20)
        .map((r) => r.tokenStr)
        .filter((t) => t && t.length > 0),
    [rankedIndexed]
  );
  // Debug: log visibleTokens
  console.log("DEMOTRADING - VISIBLE TOKENS FOR SEARCH:", visibleTokens);

  const livePrices = useRestLivePrices(visibleTokens, 1000);
  useEffect(() => {
    console.log("DEMOTRADING - LIVE PRICES OBJECT:", livePrices);
  }, [livePrices]);

  const activeTradeTokens = useMemo(
    () =>
      activeTrades
        .map(
          (trade) =>
            trade.instrument_token ||
            instrumentsData.find(
              (m) => m.tradingsymbol === trade.tradingsymbol || m.symbol === trade.tradingsymbol
            )?.instrument_token
        )
        .filter(Boolean)
        .map((t) => String(t)),
    [activeTrades]
  );
  const activeTradeLTPs = useRestLivePrices(activeTradeTokens, 1000);

  function refreshOrdersTab() {
    setOrdersRefreshSignal((s) => s + 1);
  }

  useEffect(() => {
    setClosePrices({});
    function calcOpen() {
      const istNow = getISTNow();
      setMarketOpen(isMarketOpenIST(istNow));
    }
    calcOpen();
    const interval = setInterval(calcOpen, 60000);
    return () => clearInterval(interval);
  }, []);

  useOrderSocket({
    userId: resolvedUid || account?.id || account?._id,
    onOrderUpdate: refreshOrdersTab,
  });

  const liveActiveTrades = useMemo(() => {
    return activeTrades.map((trade) => {
      const token =
        trade.instrument_token ||
        instrumentsData.find((m) => m.tradingsymbol === trade.tradingsymbol || m.symbol === trade.tradingsymbol)
          ?.instrument_token;

      const liveLtpObj = activeTradeLTPs[String(token)];
      const liveLtp =
        (liveLtpObj && typeof liveLtpObj === "object"
          ? liveLtpObj.price ?? liveLtpObj.last_price ?? liveLtpObj.ltp
          : typeof liveLtpObj === "number"
          ? liveLtpObj
          : undefined);

      const displayLtp = (typeof liveLtp === "number" ? liveLtp : undefined) ?? trade.ltp ?? trade.price ?? 0;

      const entryPrice = trade.price ?? 0;
      const qty = trade.quantity ?? 0;
      const isBuy = (trade.transaction_type ?? trade.side ?? "BUY") === "BUY";
      const pnl = isBuy ? (displayLtp - entryPrice) * qty : (entryPrice - displayLtp) * qty;

      return {
        ...trade,
        instrument_token: token ?? trade.instrument_token,
        liveLtp,
        ltp: displayLtp,
        pnl,
      };
    });
  }, [activeTrades, activeTradeLTPs]);

  const liveTotalActivePNL = useMemo(
    () => liveActiveTrades.reduce((sum, trade) => sum + (trade.pnl ?? 0), 0),
    [liveActiveTrades]
  );

  const liveBalance = useMemo(() => {
    return (account?.balance ?? 0) + liveTotalActivePNL;
  }, [account?.balance, liveTotalActivePNL]);

  const format2 = (val) => {
    const num = typeof val === "number" ? val : Number(val || 0);
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isBreached = useMemo(() => {
    const st = String(account?.status || "").toLowerCase();
    return account?.breached === true || st === "breached";
  }, [account]);
  const tradingDisabled = useMemo(() => isBreached || account?.tradingEnabled === false, [isBreached, account?.tradingEnabled]);

  async function closeMISBatch(tradesToClose, reason = "MIS auto square-off", activeLtpMap = {}) {
    if (!resolvedUid || !resolvedDocId || !tradesToClose?.length) return;
    const db = getFirestore();

    await new Promise((r) => setTimeout(r, 50));
    const snapByToken = buildExitSnapshot(tradesToClose, activeLtpMap);

    let totalPnl = 0;
    try {
      const updates = tradesToClose.map(async (trade) => {
        const token = tokenForTrade(trade) || String(trade?.instrument_token || "");
        const tokenInfo = token ? snapByToken.get(token) : undefined;

        const exitPx =
          (tokenInfo && tokenInfo.price) ??
          (typeof trade?.liveLtp === "number" && trade.liveLtp > 0 && trade.liveLtp) ??
          0;

        const entryPrice = Number(trade?.price || 0);
        const qty = Number(trade?.quantity || 0);
        const side = String(trade?.transaction_type ?? trade?.side ?? "BUY").toUpperCase();
        const isBuy = side === "BUY";
        const pnl = isBuy ? (exitPx - entryPrice) * qty : (entryPrice - exitPx) * qty;
        totalPnl += pnl;

        const exchangeNormalized =
          (tokenInfo && tokenInfo.exchange) || getExchangeFromToken(token) || "NSE";

        const tradeRef = doc(db, "users", resolvedUid, "challenges", resolvedDocId, "trades", trade.id);
        await updateDoc(tradeRef, {
          status: "CLOSED",
          closedAt: new Date(),
          exitDate: new Date(),
          exitPrice: exitPx,
          pnl,
          closeReason: reason,
          autoSquaredOff: reason.toLowerCase().includes("auto"),
          exchange: exchangeNormalized,
        });

        try {
          const tradeHistoryRef = collection(db, "users", resolvedUid, "challenges", resolvedDocId, "tradeHistory");
          await addDoc(tradeHistoryRef, {
            ...trade,
            status: "CLOSED",
            closedAt: new Date(),
            exitDate: new Date(),
            exitPrice: exitPx,
            pnl,
            closeReason: reason,
            autoSquaredOff: reason.toLowerCase().includes("auto"),
            archivedFrom: reason.toLowerCase().includes("auto") ? "MIS_auto" : "manual",
            exchange: exchangeNormalized,
          });
        } catch (e) {
          console.warn("[MIS Close] archive error:", e?.message);
        }
      });

      await Promise.all(updates);

      try {
        const challengeRef = doc(db, "users", resolvedUid, "challenges", resolvedDocId);
        const snap = await getDoc(challengeRef);
        if (snap.exists()) {
          const c = snap.data() || {};
          await updateDoc(challengeRef, {
            balance: (c.balance ?? 0) + totalPnl,
            pnl: (c.pnl ?? 0) + totalPnl,
            updatedAt: new Date(),
          });
        }
      } catch (e) {
        console.warn("[MIS Close] challenge update error:", e?.message);
      }
    } catch (e) {
      console.warn("[MIS Close] error:", e?.message);
    }
  }

  async function squareOffAllMIS() {
    const misActive = liveActiveTrades.filter(
      (t) =>
        t.status === "ACTIVE" &&
        ((t.product ?? t.product_type ?? t.order_type) || "").toUpperCase() === "MIS"
    );
    if (misActive.length === 0) return;
    await closeMISBatch(misActive, "Manual square-off (MIS only)", activeTradeLTPs);
  }

  useEffect(() => {
    const timer = setInterval(async () => {
      if (!resolvedUid || !resolvedDocId) return;

      const istNow = getISTNow();
      const todayKey = ymd(istNow);

      if (!isMarketOpenIST(istNow)) return;
      if (!isWithinMISAutoSqOffWindow(istNow, MIS_SQOFF_MINUTES_BEFORE_CLOSE)) return;
      if (lastAutoSqoffDateRef.current === todayKey) return;

      const misActive = liveActiveTrades.filter(
        (t) =>
          t.status === "ACTIVE" &&
          ((t.product ?? t.product_type ?? t.order_type) || "").toUpperCase() === "MIS"
      );
      if (misActive.length === 0) {
        lastAutoSqoffDateRef.current = todayKey;
        return;
      }

      await closeMISBatch(misActive, "MIS auto square-off", activeTradeLTPs);
      lastAutoSqoffDateRef.current = todayKey;
    }, 15000);

    return () => clearInterval(timer);
  }, [resolvedUid, resolvedDocId, liveActiveTrades, activeTradeLTPs]);

  useLimitOrderExecutor({
    uid: resolvedUid,
    challengeId: resolvedDocId,
    marketOpen,
    onExecuted: refreshOrdersTab,
  });

  function handleTradeAction(actionType, trade) {
    if (actionType === "add") {
      navigation.navigate("OrderScreen", { instrument: trade, trade });
      return;
    }
    if (actionType === "exit") {
      closeMISBatch([trade], "Manual single exit", activeTradeLTPs);
      return;
    }
    const sqKeys = ["squareOff", "squareoff", "exit_all", "exitAll", "close_all", "closeAll"];
    if (sqKeys.includes(String(actionType))) {
      squareOffAllMIS();
    }
  }

  const combinedSortedHistory = useMemo(() => {
    const merged = [...(tradeHistory || []), ...(archivedTradeHistory || [])];
    const todayOnly = merged.filter(isISTTodayByEndTime);
    const seen = new Set();
    const unique = [];
    for (const t of todayOnly) {
      const sig = tradeSignature(t);
      if (seen.has(sig)) continue;
      unique.push(t);
    }
    return sortTradesByLatestEnd(unique);
  }, [tradeHistory, archivedTradeHistory]);

  const accountTitle = (a) => {
    if (!a) return "Select Account";
    if (a.title) return a.title;
    const acctNo = a.accountNumber || a.fundedAccountNumber || a.challengeNumber || "";
    const sizeLabel =
      a.sizeLabel ||
      (a.phaseStartBalance
        ? `${(a.phaseStartBalance / 100000).toFixed(0)} Lakh Challenge`
        : "Challenge");
    return acctNo ? `${sizeLabel} #${acctNo}` : sizeLabel;
  };

  const accountSubtitle = (a) => {
    if (!SHOW_ACCOUNT_METRICS_IN_SELECTOR) {
      return a?.fundedAccountNumber ? "Funded" : `Phase ${a?.phase ?? 1}`;
    }
    const bal = a?.balance ?? 0;
    const pnl = a?.pnl ?? 0;
    const phase = a?.fundedAccountNumber ? "Funded" : `Phase ${a?.phase ?? 1}`;
    const pnlStr = (pnl >= 0 ? "+" : "") + Number(pnl).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const balStr = Number(bal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${phase} • Balance ₹${balStr} • P&L ${pnlStr}`;
  };

  function renderAccountSelectorModal() {
    return (
      <Modal visible={showSelector} animationType="fade" transparent onRequestClose={() => setShowSelector(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.mode === "dark" ? "#00000080" : "#00000040" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.brand, marginBottom: 12 }}>
              Select Account
            </Text>

            {allAccounts.length === 0 ? (
              <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>No accounts found.</Text>
            ) : (
              <FlatList
                data={allAccounts}
                keyExtractor={(item, idx) =>
                  String(item.id || item.docId || item.accountNumber || item.fundedAccountNumber || idx)
                }
                renderItem={({ item }) => {
                  const isSelected =
                    (selectedChallenge?.id && item?.id && selectedChallenge.id === item.id) ||
                    (selectedChallenge?.docId && item?.docId && selectedChallenge.docId === item.docId) ||
                    (selectedChallenge?.accountNumber && item?.accountNumber && selectedChallenge.accountNumber === item.accountNumber) ||
                    (selectedChallenge?.fundedAccountNumber && item?.fundedAccountNumber && selectedChallenge.fundedAccountNumber === item.fundedAccountNumber);

                  const subtitle = accountSubtitle(item);
                  const isFunded = subtitle.toLowerCase().includes("funded");

                  return (
                    <TouchableOpacity
                      style={[
                        styles.acctRow,
                        { borderColor: theme.border, backgroundColor: theme.mode === "dark" ? "#101218" : "#f7f8ff" },
                        isSelected && { borderColor: theme.brand, backgroundColor: theme.brand + "10" },
                      ]}
                      onPress={() => {
                        setSelectedChallenge(item);
                        setShowSelector(false);
                      }}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text
                          style={[
                            styles.acctTitle,
                            { color: theme.text },
                            isSelected && { color: theme.brand },
                          ]}
                          numberOfLines={1}
                        >
                          {accountTitle(item)}
                        </Text>

                        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center" }}>
                          <View
                            style={[
                              styles.phaseChip,
                              isFunded ? { backgroundColor: "#E8FFF2" } : { backgroundColor: "#EEF2FF" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.phaseChipText,
                                isFunded ? { color: "#1B5E20" } : { color: "#1c38d4" },
                              ]}
                            >
                              {subtitle}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.brand} />}
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                style={{ maxHeight: 360, marginBottom: 12 }}
              />
            )}

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.brand }]} onPress={() => setShowSelector(false)}>
              <Text style={[styles.closeBtnText, { color: theme.white }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderSelectorButton() {
    return (
      <View style={styles.selectorBtnWrap}>
        <TouchableOpacity
          style={[styles.selectorBtn, { backgroundColor: theme.card, borderColor: theme.brand, borderWidth: 2 }]}
          onPress={() => setShowSelector(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.selectorBtnText, { color: theme.brand }]} numberOfLines={1}>
            {accountTitle(selectedChallenge)}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.brand} />
        </TouchableOpacity>
      </View>
    );
  }

  function renderBreachBanner() {
    const breached = isBreached;
    if (!breached) return null;
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", flexDirection: "row", alignItems: "center" }}>
        <Ionicons name="alert-circle" size={20} color={STATUS_COLORS.BREACHED} />
        <Text style={{ color: "#991b1b", fontWeight: "700" }}>Challenge breached due to maximum loss limit hit.</Text>
      </View>
    );
  }

  function renderAccountDashboard() {
    if (!selectedChallenge) return null;
    const profitValue = (account?.balance ?? 0) + liveTotalActivePNL - (selectedChallenge?.phaseStartBalance ?? 0);
    const pnlColor = profitValue > 0 ? "#388e3c" : profitValue < 0 ? "#e53935" : theme.textSecondary;
    const pnlDisplay = profitValue > 0 ? `+${format2(profitValue)}` : format2(profitValue);

    return (
      <View style={[styles.statusCard, { backgroundColor: theme.card, shadowColor: theme.brand + "22" }]}>
        <View style={styles.statusRow}>
          <View>
            <Text style={[styles.sectionHeader, { color: theme.brand }]}>Account Status</Text>
            <Text style={[styles.challengeName, { color: theme.sectionTitle }]}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Challenge: </Text>
              {(selectedChallenge?.phaseStartBalance ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.challengeName, { color: theme.sectionTitle }]}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Phase: </Text>
              {selectedChallenge?.fundedAccountNumber ? "Funded" : (selectedChallenge?.phase ?? 1)}
            </Text>
            <Text style={[styles.challengeName, { color: theme.sectionTitle }]}>
              <Text style={[styles.statusLabel, { color: theme.textSecondary }]}>Target: </Text>
              {(selectedChallenge?.profitTarget ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.balanceCol}>
            <Text style={[styles.balanceLabel, { color: theme.brand }]}>Balance:</Text>
            <Text style={[styles.balanceValue, { color: theme.brand }]}>{format2(liveBalance)}</Text>
            <Text style={[styles.profitLabel, { color: theme.brand }, { marginTop: 5 }]}>P&L:</Text>
            <Text style={[styles.profitValue, { color: pnlColor }, { fontWeight: "bold" }]}>{pnlDisplay}</Text>
          </View>
        </View>
      </View>
    );
  }

  function renderTotalPNLCard() {
    const isNumber = typeof liveTotalActivePNL === "number" && !Number.isNaN(liveTotalActivePNL);
    const absVal = isNumber ? Math.abs(liveTotalActivePNL) : 0;
    const formatted = absVal.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const sign = isNumber ? (liveTotalActivePNL >= 0 ? "+" : "-") : "";
    const colorStyle =
      liveTotalActivePNL > 0 ? styles.pnlPositive : liveTotalActivePNL < 0 ? styles.pnlNegative : { color: theme.textSecondary };

    return (
      <View style={[styles.totalPnlCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.totalPnlLabel, { color: theme.text }]}>Total P&L</Text>
        <Text style={[styles.totalPnlValue, colorStyle]}>
          {isNumber ? `${sign}${formatted}` : "+0.00"}
        </Text>
      </View>
    );
  }

  function renderSearchBar() {
    return (
      <View style={{ marginHorizontal: 22, marginBottom: 14, marginTop: 2 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.border,
            padding: 12,
          }}
          onPress={() => setShowSearch(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={22} color={theme.brand} style={{ marginRight: 9 }} />
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
            {instrumentQuery.length === 0 ? "Search instruments..." : instrumentQuery}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSearchOverlay() {
    if (!showSearch) return null;
    return (
      <Modal animationType="fade" transparent visible={showSearch} onRequestClose={() => setShowSearch(false)}>
        <View style={[styles.overlayContainer, { backgroundColor: theme.background }]}>
          <TouchableOpacity
            style={[styles.closeOverlayBtn, { position: "absolute", left: 12, top: 12 }]}
            onPress={() => {
              setInstrumentQuery("");
              setShowSearch(false);
            }}
          >
            <Text style={{ fontSize: 28, color: theme.brand, fontWeight: "bold" }}>←</Text>
          </TouchableOpacity>
          <View style={styles.overlaySearchBar}>
            <TextInput
              style={[
                styles.searchInput,
                { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
              ]}
              placeholder="Search instruments"
              value={instrumentQuery}
              onChangeText={setInstrumentQuery}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
          </View>
          <FlatList
            data={rankedInstruments.slice(0, 20).map((inst) => {
              const tokenStr = String(inst.instrument_token ?? inst.token ?? "");
              let priceVal = undefined;
              const priceObj = livePrices[tokenStr];
              // Debug: log token and price object
              console.log("DEMOTRADING - RENDER TOKEN:", tokenStr, "PRICE OBJ:", priceObj);

              if (priceObj && typeof priceObj === "object") {
                priceVal =
                  priceObj.price ??
                  priceObj.last_price ??
                  priceObj.ltp ??
                  (typeof priceObj === "number" ? priceObj : undefined);
              } else if (typeof priceObj === "number") {
                priceVal = priceObj;
              }

              const cp = tokenStr ? closePrices[tokenStr] : undefined;
              return {
                ...inst,
                _tokenStr: tokenStr,
                last_price: priceVal,
                close_price: cp,
              };
            })}
            keyExtractor={(item, idx) => String(item.instrument_token ?? item._tokenStr ?? idx)}
            renderItem={({ item }) => {
              const ex = getExchange(item);
              const parts = getTwoLineParts(item);
              const line1 = parts.line1 || getSymbolRaw(item);
              const line2Core = parts.line2;
              const line2 = [line2Core, parts.weekly ? "(W)" : "", ex ? `• ${ex}` : ""]
                .filter(Boolean)
                .join(" ")
                .replace(/\s+•/, " • ");

              let priceVal = item.last_price;
              if (priceVal && typeof priceVal === "object") {
                priceVal =
                  priceVal.price ??
                  priceVal.last_price ??
                  priceVal.ltp ??
                  (typeof priceVal === "number" ? priceVal : undefined);
              }

              const rawCode = getSymbolRaw(item);
              const equityName = getName(item);
              const tertiary = [rawCode, equityName].filter(Boolean).join(" • ");

              return (
                <TouchableOpacity
                  style={[styles.itemRow, { borderBottomColor: theme.border }]}
                  onPress={() => {
                    const q = instrumentQuery;
                    setInstrumentQuery("");
                    setShowSearch(false);
                    navigation.navigate("InstrumentDetailScreen", {
                      instrument: item,
                      challenge: selectedChallenge,
                      demoAccountType:
                        selectedChallenge?.type ||
                        (selectedChallenge?.title?.includes("1L")
                          ? "1L"
                          : selectedChallenge?.title?.includes("5L")
                          ? "5L"
                          : selectedChallenge?.title?.includes("10L")
                          ? "10L"
                          : undefined),
                      searchScreenName: route.name,
                      searchQuery: q,
                    });
                  }}
                >
                  <View style={{ flexShrink: 1, paddingRight: 10, flex: 1 }}>
                    <Text style={[styles.titleLine]} numberOfLines={1}>
                      {line1}
                    </Text>
                    <Text style={[styles.subLine, { color: theme.textSecondary }]} numberOfLines={1}>
                      {line2}
                    </Text>
                    {!!tertiary && (
                      <Text style={[styles.tertiary, { color: theme.textSecondary }]} numberOfLines={1}>
                        {tertiary}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.price}>
                    {typeof priceVal === "number" && !isNaN(priceVal) ? `₹${priceVal}` : "—"}
                  </Text>
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
            style={{ width: "100%" }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No instruments found</Text>
            }
          />
        </View>
      </Modal>
    );
  }

  function renderTradeTabBar() {
    return (
      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        {TAB_ROUTES.map((routeItem) => (
          <TouchableOpacity
            key={routeItem.key}
            style={[styles.tabBarItem, tradeTab === routeItem.key && { backgroundColor: theme.brand }]}
            onPress={() => setTradeTab(routeItem.key)}
          >
            <Text
              style={[
                styles.tabBarText,
                { color: tradeTab === routeItem.key ? theme.white : theme.brand, fontWeight: "bold" },
              ]}
            >
              {routeItem.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  function renderOrdersTab() {
    return (
      <OrdersTab
        selectedAccount={account}
        tradingDisabled={tradingDisabled}
        refreshSignal={ordersRefreshSignal}
        onRefresh={refreshOrdersTab}
      />
    );
  }

  function renderActiveTrades() {
    const activeOnly = liveActiveTrades.filter((t) => t.status === "ACTIVE");
    return (
      <View style={{ marginTop: 18 }}>
        <ActiveTradeBar
          trades={activeOnly}
          instrumentsMeta={instrumentsData}
          onTradeAction={handleTradeAction}
          marketOpen={marketOpen}
          plusOnZero={true}
        />
      </View>
    );
  }

  function renderTradeHistory() {
    return (
      <View
        style={[
          styles.historySection,
          { backgroundColor: theme.card, shadowColor: theme.brand + "22", marginTop: 18 },
        ]}
      >
        {combinedSortedHistory.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No trade history.</Text>
        ) : (
          <View style={{ marginTop: 0 }}>
            {combinedSortedHistory.map((trade) => (
              <TradeHistoryCard
                key={trade.id ?? trade._id}
                trade={{
                  ...trade,
                  instrumentName: trade.tradingsymbol ?? trade.symbol ?? "",
                  exchange: trade.exchange ?? trade.exch ?? "NSE",
                  product: trade.product ?? trade.product_type ?? "MIS",
                  pnl:
                    typeof trade.pnl === "number"
                      ? trade.pnl
                      : trade.exitPrice !== undefined &&
                        trade.price !== undefined &&
                        trade.quantity !== undefined
                      ? ((trade.side ?? trade.transaction_type) === "BUY"
                          ? (trade.exitPrice - trade.price) * trade.quantity
                          : (trade.price - trade.exitPrice) * trade.quantity)
                      : 0,
                  exitPrice: trade.exitPrice ?? trade.closedPrice ?? trade.price ?? 0,
                  status: trade.status,
                  quantity: trade.quantity ?? 0,
                  price: trade.price ?? 0,
                }}
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  if (fetchError)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <Text style={{ color: "#e53935", fontSize: 18, marginBottom: 12 }}>{fetchError}</Text>
        <TouchableOpacity
          onPress={() => {
            setFetchError(null);
            fetchDemoAccounts();
            if (fetchFundedAccounts) fetchFundedAccounts();
          }}
          style={{ backgroundColor: theme.brand, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 10 }}
        >
          <Text style={{ color: theme.white, fontWeight: "bold" }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );

  if (allAccounts.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <Text style={{ color: theme.brand, fontSize: 18 }}>
          No trading accounts found. Please buy a challenge.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Challenges")}
          style={{ backgroundColor: theme.brand, padding: 16, borderRadius: 10, marginTop: 16 }}
        >
          <Text style={{ color: theme.white, fontWeight: "bold" }}>Go to Challenges</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.outerContainer, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageHeader, { color: theme.brand, alignSelf: "center" }]}>Demo Trading</Text>
        {renderBreachBanner()}
        {renderSelectorButton()}
        {renderAccountSelectorModal()}
        {renderAccountDashboard()}
        {renderTotalPNLCard()}
        {renderSearchBar()}
        {renderSearchOverlay()}
        {renderTradeTabBar()}
        {tradeTab === "orders" && renderOrdersTab()}
        {tradeTab === "active" && renderActiveTrades()}
        {tradeTab === "history" && renderTradeHistory()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  pageHeader: {
    fontSize: 26,
    fontWeight: "bold",
    letterSpacing: 0.2,
    marginTop: 26,
    marginBottom: 10,
    alignSelf: "center",
  },
  selectorBtnWrap: {
    alignItems: "center",
    marginBottom: 18,
    marginTop: 10,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff",
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 30,
    borderColor: "#1740FF",
    borderWidth: 2,
    gap: 10,
    maxWidth: "92%",
  },
  selectorBtnText: {
    fontWeight: "bold",
    fontSize: 16,
    color: "#1c38d4",
    maxWidth: "86%",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000040",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: "90%",
    minHeight: 160,
    maxHeight: 520,
    padding: 18,
    shadowColor: "#1c38d499",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 7 },
    alignItems: "stretch",
  },
  acctRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  acctTitle: { fontSize: 15.5, fontWeight: "800" },
  phaseChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phaseChipText: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  closeBtn: {
    backgroundColor: "#1c38d4",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  closeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  statusCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "flex-start",
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1976d2",
    marginBottom: 6,
  },
  challengeName: {
    fontSize: 15,
    marginBottom: 2,
    fontWeight: "600",
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  balanceCol: {
    alignItems: "flex-end",
    marginLeft: 18,
    minWidth: 90,
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
    color: "#1740FF",
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 7,
    color: "#1740FF",
  },
  profitLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 5,
  },
  profitValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalPnlCard: {
    marginTop: 6,
    marginBottom: 16,
    alignSelf: "center",
    width: "72%",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 0,
  },
  totalPnlLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  totalPnlValue: {
    fontSize: 20,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  pnlPositive: { color: "#388e3c" },
  pnlNegative: { color: "#e53935" },
  searchInput: {
    borderRadius: 10,
    padding: 16,
    fontSize: 17,
    borderWidth: 1,
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
  },
  overlaySearchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  closeOverlayBtn: {
    marginLeft: 12,
    padding: 8,
    zIndex: 10,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  titleLine: { fontSize: 16, fontWeight: "700", color: "#111" },
  subLine: { fontSize: 12.5, fontWeight: "600" },
  tertiary: { fontSize: 11, marginTop: 2 },
  price: { fontSize: 16, fontWeight: "bold", color: "#22b573", marginLeft: 10 },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    marginVertical: 18,
  },
  historySection: {
    borderRadius: 13,
    padding: 16,
    marginTop: 18,
    elevation: 2,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabBar: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 6,
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "center",
    width: "90%",
  },
  tabBarItem: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarText: {
    fontSize: 16,
  },
});
