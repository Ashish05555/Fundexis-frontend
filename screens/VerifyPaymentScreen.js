import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextInput,
  FlatList,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useChallenge } from "../context/ChallengeContext";
import instrumentsData from "../data/instruments.json";
import useLivePrices from "../hooks/useLivePrices";
import { useOrderSocket } from "../utils/socketSetup";
import OrdersTab from "./OrdersTab";

const STATUS_COLORS = {
  ACTIVE: "#22b573",
  BREACHED: "#e53935",
  COMPLETED: "#1976d2",
  PROFIT: "#22b573",
  LOSS: "#e53935",
  BALANCE: "#1740FF", // blue
};

const getServerUrl = () =>
  Platform.OS === "android"
    ? "http://192.168.29.246:5000"
    : "http://localhost:5000";

const TRADES_API = `${getServerUrl()}/api/orders`;
const CLOSE_PRICES_API = `${getServerUrl()}/api/close-prices`;
const MARKET_STATUS_API = `${getServerUrl()}/api/marketstatus`;

const SAVE_LAST_SELECTED_API = `${getServerUrl()}/api/users/save-last-selected-account`;
const GET_LAST_SELECTED_API = `${getServerUrl()}/api/users/get-last-selected-account`;

const TAB_ROUTES = [
  { key: "orders", title: "Orders" },
  { key: "active", title: "Active Trades" },
  { key: "history", title: "Trade History" },
];

export default function DemoTradingScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    selectedChallenge,
    setSelectedChallenge,
    demoAccounts,
    fetchDemoAccounts,
  } = useChallenge();

  const [showSelector, setShowSelector] = useState(false);
  const [instrumentQuery, setInstrumentQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [closePrices, setClosePrices] = useState({});
  const [marketOpen, setMarketOpen] = useState(false);
  const [tradeTab, setTradeTab] = useState("orders");
  const [activeTrades, setActiveTrades] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ordersRefreshSignal, setOrdersRefreshSignal] = useState(0);

  useEffect(() => {
    fetchDemoAccounts("demo");
  }, []);

  useEffect(() => {
    if (demoAccounts && demoAccounts.length > 0 && !selectedChallenge) {
      getLastSelectedAccount();
    }
    // eslint-disable-next-line
  }, [demoAccounts, selectedChallenge]);

  async function saveLastSelectedAccount(accountId) {
    try {
      await fetch(SAVE_LAST_SELECTED_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
        credentials: "include",
      });
    } catch (e) {}
  }

  async function getLastSelectedAccount() {
    try {
      const res = await fetch(GET_LAST_SELECTED_API, { credentials: "include" });
      const { lastSelectedDemoAccountId } = await res.json();
      if (lastSelectedDemoAccountId) {
        setSelectedChallenge(
          demoAccounts.find(
            (a) => a._id === lastSelectedDemoAccountId || a.id === lastSelectedDemoAccountId
          )
        );
      } else if (demoAccounts.length) {
        setSelectedChallenge(demoAccounts[0]);
      }
    } catch (e) {
      if (demoAccounts.length) setSelectedChallenge(demoAccounts[0]);
    }
  }

  const filteredInstruments = instrumentQuery.trim()
    ? instrumentsData.filter(
        (inst) =>
          inst.tradingsymbol
            ?.toLowerCase()
            .includes(instrumentQuery.toLowerCase()) ||
          inst.name?.toLowerCase().includes(instrumentQuery.toLowerCase())
      )
    : [];

  const visibleTokens = filteredInstruments
    .slice(0, 20)
    .map((inst) => inst.instrument_token);

  const livePrices = useLivePrices(visibleTokens);
  const account = selectedChallenge;

  function refreshOrdersTab() {
    setOrdersRefreshSignal((signal) => signal + 1);
    fetchTrades();
  }

  useEffect(() => {
    let isMounted = true;
    async function fetchClosePrices() {
      try {
        const res = await fetch(CLOSE_PRICES_API);
        const data = await res.json();
        const map = {};
        data.forEach((inst) => {
          map[inst.instrument_token] = inst.close;
        });
        if (isMounted) setClosePrices(map);
      } catch (err) {
        if (isMounted) setClosePrices({});
      }
    }
    fetchClosePrices();

    async function fetchMarketOpen() {
      try {
        const res = await fetch(MARKET_STATUS_API);
        const data = await res.json();
        setMarketOpen(!!data.open);
      } catch (err) {
        setMarketOpen(false);
      }
    }
    fetchMarketOpen();
    const interval = setInterval(fetchMarketOpen, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const [active, history] = await Promise.all([
        fetch(`${TRADES_API}?challengeId=${account?.id || account?._id || ''}&status=ACTIVE`)
          .then((res) => res.json())
          .catch(() => []),
        fetch(`${TRADES_API}?challengeId=${account?.id || account?._id || ''}&status=HISTORY`)
          .then((res) => res.json())
          .catch(() => []),
      ]);
      setActiveTrades(Array.isArray(active) ? active : []);
      setTradeHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      setActiveTrades([]);
      setTradeHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (account) fetchTrades();
    // eslint-disable-next-line
  }, [account]);

  useOrderSocket({
    userId: account?.id || account?._id,
    onOrderUpdate: () => {
      refreshOrdersTab();
    },
  });

  const totalTrades = [...activeTrades, ...tradeHistory];
  const totalPNL = totalTrades.reduce((sum, trade) => {
    let currPrice;
    if (trade.status === "COMPLETED" && typeof trade.exitPrice === "number") {
      currPrice = trade.exitPrice;
    } else {
      currPrice =
        livePrices[trade.instrument_token] ||
        trade.entryPrice ||
        trade.price ||
        0;
    }
    return (
      sum +
      (trade.transaction_type === "BUY"
        ? (currPrice - trade.price) * trade.quantity
        : (trade.price - currPrice) * trade.quantity)
    );
  }, 0);

  const safeNum = (val) =>
    typeof val === "number" ? val.toLocaleString() : "0";
  const safeStr = (val, fallback = "") =>
    val !== undefined && val !== null ? val : fallback;

  const phaseProfit = account
    ? (account.balance ?? 0) - (account.phaseStartBalance ?? 0)
    : 0;

  // --- Modal Account Selector ---
  function renderAccountSelectorModal() {
    return (
      <Modal
        visible={showSelector}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSelector(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                theme.mode === "dark" ? "#00000080" : "#00000040",
            },
          ]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.card },
            ]}
          >
            <Text style={[styles.modalHeader, { color: theme.brand }]}>
              Select Trading Account
            </Text>
            {/* Scrollable container for accounts! */}
            <View style={styles.accountsScrollContainer}>
              <ScrollView>
                {demoAccounts.map((acc, idx) => {
                  const selected =
                    selectedChallenge &&
                    (
                      (selectedChallenge._id && acc._id && selectedChallenge._id === acc._id) ||
                      (selectedChallenge.id && acc.id && selectedChallenge.id === acc.id) ||
                      (selectedChallenge.accountNumber && acc.accountNumber && selectedChallenge.accountNumber === acc.accountNumber)
                    );
                  return (
                    <TouchableOpacity
                      key={acc._id || acc.id || idx}
                      style={[
                        styles.accountCard,
                        {
                          backgroundColor: theme.card,
                          borderColor: selected
                            ? theme.brand
                            : theme.border,
                          borderWidth: selected ? 3 : 1.5,
                        },
                      ]}
                      onPress={async () => {
                        setSelectedChallenge(acc);
                        await saveLastSelectedAccount(acc._id || acc.id);
                        setShowSelector(false);
                      }}
                      activeOpacity={0.86}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.accountTitle, { color: theme.brand }]}>
                          {acc.title
                            ? acc.title
                            : `${acc.type} Challenge Phase ${acc.phase || 1} #${acc.accountNumber}`}
                        </Text>
                        <Text style={[styles.accountPhase, { color: "#22b573" }]}>
                          Phase {acc.phase || 1}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            {/* Close button outside scroll, always visible */}
            <TouchableOpacity
              style={[
                styles.closeBtn,
                { backgroundColor: theme.brand },
              ]}
              onPress={() => setShowSelector(false)}
            >
              <Text style={[styles.closeBtnText, { color: theme.white }]}>
                Close
              </Text>
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
          style={[
            styles.selectorBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.brand,
              borderWidth: 2,
            },
          ]}
          onPress={() => setShowSelector(true)}
          activeOpacity={0.85}
        >
          <Text style={[styles.selectorBtnText, { color: theme.brand }]}>
            {selectedChallenge
              ? selectedChallenge.title
                ? selectedChallenge.title
                : `${selectedChallenge.type} Challenge Phase ${selectedChallenge.phase || 1} #${selectedChallenge.accountNumber}`
              : "Select Account"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.brand} />
        </TouchableOpacity>
      </View>
    );
  }

  // --- FIXED ACCOUNT DASHBOARD ---
  function renderAccountDashboard() {
    if (!account) {
      return (
        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.card,
              shadowColor: theme.brand + "22",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 220,
            },
          ]}
        >
          <Text
            style={{
              color: theme.brand,
              fontSize: 19,
              marginBottom: 12,
              fontWeight: "bold",
            }}
          >
            No Challenge Selected
          </Text>
          <Text style={{ color: theme.text, marginBottom: 18 }}>
            Please buy a challenge to begin trading.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.brand,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 10,
              marginTop: 8,
            }}
            onPress={() => navigation.navigate("Challenges")}
          >
            <Text
              style={{
                color: theme.white,
                fontWeight: "bold",
                fontSize: 16,
              }}
            >
              Go to Challenges
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Profit/Loss logic and colors:
    const profitIsPositive = phaseProfit >= 0;
    const profitLabel = profitIsPositive ? "Profit:" : "Loss:";
    const profitColor = profitIsPositive ? STATUS_COLORS.PROFIT : STATUS_COLORS.LOSS;
    const profitValueStr = profitIsPositive
      ? `₹${safeNum(phaseProfit)}`
      : `₹${safeNum(Math.abs(phaseProfit))}`;

    return (
      <View
        style={[
          styles.statusCard,
          { backgroundColor: theme.card, shadowColor: theme.brand + "22" },
        ]}
      >
        <View style={styles.statusRow}>
          <View>
            <Text
              style={[styles.sectionHeader, { color: theme.brand }]}
            >
              Account Status
            </Text>
            <Text
              style={[styles.challengeName, { color: theme.sectionTitle }]}
            >
              <Text
                style={[styles.statusLabel, { color: theme.textSecondary }]}
              >
                Challenge:{" "}
              </Text>
              ₹{safeNum(account.phaseStartBalance)}
            </Text>
            <Text
              style={[styles.challengeName, { color: theme.sectionTitle }]}
            >
              <Text
                style={[styles.statusLabel, { color: theme.textSecondary }]}
              >
                Phase:{" "}
              </Text>
              {safeStr(account.phase, 1)}
            </Text>
            <Text
              style={[styles.challengeName, { color: theme.sectionTitle }]}
            >
              <Text
                style={[styles.statusLabel, { color: theme.textSecondary }]}
              >
                Target:{" "}
              </Text>
              ₹{safeNum(account.profitTarget)}
            </Text>
            <Text
              style={[styles.phaseInfo, { color: theme.sectionTitle }]}
            >
              {account.phaseTwoCompleted
                ? "🎉 Both Phases Completed! Challenge Complete!"
                : account.phase === 1
                ? "Phase 1 in progress"
                : "Phase 2 in progress"}
            </Text>
            {account.status === "BREACHED" && (
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: STATUS_COLORS.BREACHED,
                    fontWeight: "bold",
                    fontSize: 16,
                    marginRight: 6,
                  }}
                >
                  Breached
                </Text>
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color={STATUS_COLORS.BREACHED}
                />
              </View>
            )}
          </View>
          <View style={styles.balanceCol}>
            {/* Balance in blue for all accounts */}
            <Text
              style={[styles.balanceLabel, { color: STATUS_COLORS.BALANCE }]}
            >
              Balance:
            </Text>
            <Text style={[styles.balanceValue, { color: STATUS_COLORS.BALANCE }]}>
              ₹{safeNum(account.balance)}
            </Text>
            {/* Profit/Loss color logic */}
            <Text style={[styles.profitLabel, { color: profitColor }]}>
              {profitLabel}
            </Text>
            <Text style={[styles.profitValue, { color: profitColor }]}>
              {profitValueStr}
            </Text>
          </View>
        </View>
        {account.status === "BREACHED" && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: STATUS_COLORS.BREACHED }}>
              Reason: {safeStr(account.breachReason, "Max loss breached")}
            </Text>
            <Text style={{ color: STATUS_COLORS.BREACHED }}>
              Date:{" "}
              {account.breachTimestamp
                ? new Date(
                    account.breachTimestamp
                  ).toLocaleString()
                : "-"}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // --- TOTAL PNL CARD (kept unchanged) ---
  function renderTotalPNLCard() {
    const isProfit = totalPNL >= 0;
    return (
      <View style={[styles.totalPnlCard, { backgroundColor: theme.card }]}>
        <Text style={[styles.totalPnlLabel, { color: theme.text }]}>
          Total Trades P&amp;L
        </Text>
        <Text
          style={[
            styles.totalPnlValue,
            isProfit ? styles.pnlPositive : styles.pnlNegative,
          ]}
        >
          {isProfit ? "+" : ""}
          {typeof totalPNL === "number"
            ? totalPNL.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : "0.00"}
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
          <Ionicons
            name="search"
            size={22}
            color={theme.brand}
            style={{ marginRight: 9 }}
          />
          <Text style={{ color: theme.textSecondary, fontSize: 16 }}>
            {instrumentQuery.length === 0
              ? "Search instruments..."
              : instrumentQuery}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderSearchOverlay() {
    if (!showSearch) return null;
    return (
      <Modal
        animationType="fade"
        transparent
        visible={showSearch}
        onRequestClose={() => setShowSearch(false)}
      >
        <View style={[styles.overlayContainer, { backgroundColor: theme.background }]}>
          {/* Back Arrow Button at Top Left */}
          <TouchableOpacity
            style={[styles.closeOverlayBtn, { position: 'absolute', left: 12, top: 12 }]}
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
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Search instrument..."
              value={instrumentQuery}
              onChangeText={setInstrumentQuery}
              placeholderTextColor={theme.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              autoFocus
            />
          </View>
          <FlatList
            data={filteredInstruments
              .slice(0, 20)
              .map((inst) => ({
                ...inst,
                last_price: livePrices[inst.instrument_token],
                close_price: closePrices[inst.instrument_token],
              }))}
            keyExtractor={(item) =>
              item.instrument_token.toString()
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.itemRow, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setInstrumentQuery("");
                  setShowSearch(false);
                  navigation.navigate("InstrumentDetailScreen", {
                    instrument: item,
                  });
                }}
              >
                <View>
                  <Text style={[styles.symbol, { color: theme.brand }]}>
                    {item.tradingsymbol}
                  </Text>
                  <Text style={[styles.name, { color: theme.textSecondary }]}>
                    {item.name}
                  </Text>
                </View>
                {!marketOpen
                  ? item.close_price !== undefined &&
                    item.close_price !== null && (
                      <Text style={styles.price}>
                        {`₹${item.close_price}`}
                      </Text>
                    )
                  : item.last_price !== undefined &&
                    item.last_price !== null && (
                      <Text style={styles.price}>
                        {`₹${item.last_price}`}
                      </Text>
                    )}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            style={{ width: "100%" }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No instruments found
              </Text>
            }
          />
        </View>
      </Modal>
    );
  }

  function renderTradeTabBar() {
    return (
      <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
        {TAB_ROUTES.map((route) => (
          <TouchableOpacity
            key={route.key}
            style={[
              styles.tabBarItem,
              tradeTab === route.key && { backgroundColor: theme.brand },
            ]}
            onPress={() => setTradeTab(route.key)}
          >
            <Text
              style={[
                styles.tabBarText,
                {
                  color:
                    tradeTab === route.key
                      ? theme.white
                      : theme.brand,
                  fontWeight:
                    tradeTab === route.key ? "bold" : "500",
                },
              ]}
            >
              {route.title}
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
        tradingDisabled={account?.status === "BREACHED"}
        refreshSignal={ordersRefreshSignal}
        onRefresh={refreshOrdersTab}
      />
    );
  }

  function renderActiveTrades() {
    const activeOnly = marketOpen
      ? activeTrades.filter((trade) => trade.status === "ACTIVE")
      : [];
    return (
      <View
        style={[
          styles.historySection,
          { backgroundColor: theme.card, shadowColor: theme.brand + "22" },
        ]}
      >
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>
          Active Trades
        </Text>
        {activeOnly.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No active trades.
          </Text>
        ) : (
          activeOnly.map((trade) => (
            <View
              key={trade._id ?? trade.id}
              style={[
                styles.tradeHistoryCard,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.tradeHistorySymbol, { color: theme.brand }]}>
                {trade.tradingsymbol ?? trade.symbol}
              </Text>
              <Text style={{ color: theme.text }}>
                {trade.transaction_type ?? trade.side} {trade.quantity} @ ₹
                {trade.price} ({trade.order_type}) {trade.time}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  }

  function renderTradeHistory() {
    return (
      <View
        style={[
          styles.historySection,
          { backgroundColor: theme.card, shadowColor: theme.brand + "22" },
        ]}
      >
        <Text style={[styles.sectionHeader, { color: theme.brand }]}>
          Trade History
        </Text>
        {tradeHistory.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No trade history.
          </Text>
        ) : (
          tradeHistory.map((trade) => (
            <View
              key={trade._id ?? trade.id}
              style={[
                styles.tradeHistoryCard,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.tradeHistorySymbol, { color: theme.brand }]}>
                {trade.tradingsymbol ?? trade.symbol}
              </Text>
              <Text style={{ color: theme.text }}>
                {trade.transaction_type ?? trade.side} {trade.quantity} @ ₹
                {trade.price} ({trade.order_type}) {trade.time}
              </Text>
              <Text style={{ color: theme.text }}>
                <Text style={{ fontWeight: "bold" }}>Account:</Text>{" "}
                {account.title
                  ? account.title
                  : `${account.type} Challenge Phase ${account.phase || 1} #${account.accountNumber}`}
              </Text>
              {trade.pnl !== undefined && (
                <Text>
                  P&L:{" "}
                  <Text
                    style={{
                      color: trade.pnl >= 0 ? "#388e3c" : "#e53935",
                    }}
                  >
                    {trade.pnl.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    );
  }

  function renderTabContent() {
    if (tradeTab === "orders") return renderOrdersTab();
    if (tradeTab === "active") return renderActiveTrades();
    if (tradeTab === "history") return renderTradeHistory();
    return null;
  }

  if (loading)
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.brand} />
        <Text style={{ marginTop: 10, color: theme.brand }}>Loading...</Text>
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={[styles.outerContainer, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* --- Remove the top left Demo Trading text --- */}
        {/* <Text style={[styles.pageHeader, { color: theme.brand }]}>
          Demo Trading
        </Text> */}
        {/* Instead, show only the centered Demo Trading below */}
        <Text style={{
          fontSize: 32,
          fontWeight: "bold",
          color: theme.brand,
          marginTop: 30,
          marginBottom: 10,
          alignSelf: 'center',
        }}>
          Demo Trading
        </Text>
        {renderSelectorButton()}
        {renderAccountSelectorModal()}
        {renderAccountDashboard()}
        {renderTotalPNLCard()}
        {renderSearchBar()}
        {renderSearchOverlay()}
        {renderTradeTabBar()}
        {renderTabContent()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1 },
  // pageHeader REMOVED from top left
  selectorBtnWrap: {
    alignItems: "center",
    marginBottom: 18,
    marginTop: 10,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef2ff", // will be overridden by theme
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    borderColor: "#1740FF", // will be overridden by theme
    borderWidth: 2,         // will be overridden by theme
    shadowColor: "#1c38d422",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  selectorBtnText: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#1c38d4",
    marginHorizontal: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000040", // will be overridden by theme
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff", // will be overridden by theme
    borderRadius: 28,
    width: "88%",
    minHeight: 220,
    maxHeight: 500,
    padding: 30,
    shadowColor: "#1c38d499",
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 7 },
    alignItems: "stretch",
  },
  modalHeader: {
    fontWeight: "bold",
    fontSize: 20,
    color: "#1c38d4", // will be overridden by theme
    alignSelf: "center",
    marginBottom: 18,
    letterSpacing: 0.2,
  },
  accountsScrollContainer: {
    flexGrow: 0,
    maxHeight: 320,
    marginBottom: 24,
  },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fbff", // will be overridden by theme
    borderRadius: 12,
    padding: 18,
    marginVertical: 7,
    borderColor: "#e0e7ff", // will be overridden by theme
    borderWidth: 1.5,       // will be overridden by theme
    elevation: 0,
  },
  accountCardSelected: {
    borderColor: "#1740FF", // will be overridden by theme
    borderWidth: 3,         // will be overridden by theme
    backgroundColor: "#eef2ff", // will be overridden by theme
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1c38d4", // will be overridden by theme
  },
  accountPhase: {
    fontSize: 15,
    color: "#22b573",
    marginTop: 3,
    fontWeight: "bold",
  },
  closeBtn: {
    backgroundColor: "#1c38d4", // will be overridden by theme
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 0,
  },
  closeBtnText: {
    color: "#fff", // will be overridden by theme
    fontWeight: "bold",
    fontSize: 18,
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
    marginBottom: 3,
    letterSpacing: 0.2,
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
    // color set in code
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 7,
    // color set in code
  },
  profitLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 5,
    // color set in code
  },
  profitValue: {
    fontSize: 16,
    fontWeight: "bold",
    // color set in code
  },
  phaseInfo: {
    fontWeight: "700",
    fontSize: 15,
    marginTop: 5,
  },
  totalPnlCard: {
    marginTop: 6,
    marginBottom: 16,
    alignSelf: "center",
    width: "72%",
    borderRadius: 12,
    padding