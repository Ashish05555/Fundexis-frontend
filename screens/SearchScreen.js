import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { searchInstruments } from '../services/apiService';
import { useLivePrices } from "../context/LivePriceProvider";
import { formatInstrumentName, buildSearchKeywords } from "../utils/instrumentName";

// Constants & helpers
const NSE_RED = "#ef5350";
const BSE_BLUE = "#2D6CDF";

const norm = (s = "") => s.toString().trim().toLowerCase();
const escapeRegExp = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getExchange = (inst = {}) => {
  const raw =
    (inst.exchange ??
      inst.exch ??
      inst.segment ??
      inst.exchSegment ??
      "").toString().toUpperCase();
  if (raw.includes("NSE")) return "NSE";
  if (raw.includes("BSE")) return "BSE";
  return raw || "";
};

const getSymbolRaw = (inst = {}) =>
  (inst.tradingsymbol || inst.trading_symbol || inst.symbol || inst.ticker || "").toString();

const getComparableSymbol = (inst = {}) => {
  const sym = getSymbolRaw(inst);
  return sym.replace(/[-.](EQ|BE|BL|BZ|PP|SM|XT|XD|XN|XB|MTF|Z)$/i, "");
};

const getName = (inst = {}) =>
  (inst.display_name || inst.name || inst.companyName || "").toString();

const baseKey = (inst = {}) => {
  const sym = norm(getComparableSymbol(inst));
  const nm = norm(getName(inst));
  return sym || nm.replace(/\s+/g, "");
};

function scoreInstrument(query, inst) {
  const q = norm(query);
  if (!q) return 0;

  const symbolComparable = norm(getComparableSymbol(inst));
  const symbolRaw = norm(getSymbolRaw(inst));
  const name = norm(getName(inst));
  const ex = getExchange(inst);

  const displayName = norm(formatInstrumentName(inst));
  const keywords = buildSearchKeywords(inst).map(norm);

  let score = 0;

  // Human-friendly name and keywords
  if (displayName === q) score += 11000;
  if (displayName.startsWith(q)) score += 6500;
  if (displayName.includes(q)) score += 1400;

  if (keywords.includes(q)) score += 10500;
  if (keywords.some(k => k.startsWith(q))) score += 6200;
  if (keywords.some(k => k.includes(q))) score += 1300;

  // Symbol/name fallbacks
  if (symbolComparable === q) score += 10000;
  if (name === q) score += 9000;

  if (symbolComparable.startsWith(q)) score += 6000;
  if (name.startsWith(q)) score += 5000;

  if (symbolRaw === q) score += 3000;
  if (symbolRaw.startsWith(q)) score += 2000;

  if (name && new RegExp(`\\b${escapeRegExp(q)}\\b`, "i").test(name)) {
    score += 1200;
  }

  if (symbolComparable.includes(q)) score += 900;
  if (name.includes(q)) score += 700;

  if (q.includes("nse") && ex === "NSE") score += 300;
  if (q.includes("bse") && ex === "BSE") score += 300;

  const type = (inst.instrument_type || inst.type || inst.segment || "").toString().toUpperCase();
  if (/(^|[^A-Z])EQ($|[^A-Z])/.test(type)) score += 120;

  if (symbolComparable) score -= Math.abs(symbolComparable.length - q.length) * 3;

  return score;
}

function rankAndFilterInstruments(query, instruments = [], opts = {}) {
  const { limit, preferNSEWithinPair = true } = opts;
  const q = norm(query);
  if (!q) return [];

  const scored = instruments
    .map((inst) => ({
      inst,
      score: scoreInstrument(query, inst),
      key: baseKey(inst),
      ex: getExchange(inst),
      symComparable: getComparableSymbol(inst),
      symRaw: getSymbolRaw(inst),
      name: getName(inst),
      displayName: formatInstrumentName(inst),
    }))
    .filter((x) => x.score > 0);

  const exactSymTop = scored.filter((x) => norm(x.symComparable) === q);
  const rest = scored.filter((x) => norm(x.symComparable) !== q);

  exactSymTop.sort((a, b) => {
    const order = (ex) => (ex === "NSE" ? 0 : ex === "BSE" ? 1 : 2);
    const d = order(a.ex) - order(b.ex);
    if (d !== 0) return d;
    if (b.score !== a.score) return b.score - a.score;
    const da = norm(a.displayName || "");
    const db = norm(b.displayName || "");
    if (da && db && da !== db) return da.localeCompare(db);
    return a.key.localeCompare(b.key);
  });

  rest.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.key && b.key && a.key === b.key && preferNSEWithinPair) {
      const order = (ex) => (ex === "NSE" ? 0 : ex === "BSE" ? 1 : 2);
      const d = order(a.ex) - order(b.ex);
      if (d !== 0) return d;
    }
    const da = norm(a.displayName || "");
    const db = norm(b.displayName || "");
    if (da && db && da !== db) return da.localeCompare(db);
    return a.key.localeCompare(b.key);
  });

  const merged = [...exactSymTop, ...rest];
  const finalArr = merged.map((x) => x.inst);
  return typeof limit === "number" ? finalArr.slice(0, limit) : finalArr;
}

const getExchangeColor = (exchange) => {
  const ex = (exchange || "").toString().toUpperCase();
  if (ex === "NSE") return NSE_RED;
  if (ex === "BSE") return BSE_BLUE;
  return "#666";
};

const parseApiResult = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.instruments)) return res.instruments;
  return [];
};

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();

  const rankedResults = useMemo(() => {
    return rankAndFilterInstruments(query, rawResults, {
      limit: 200,
      preferNSEWithinPair: true,
    });
  }, [query, rawResults]);

  // Live prices for top 20
  const tokens = useMemo(
    () => rankedResults.slice(0, 20).map(inst => String(inst.instrument_token ?? inst.token ?? "")).filter(Boolean),
    [rankedResults]
  );
  const livePrices = useLivePrices(tokens);

  const debounceRef = useRef(null);
  const triggerSearch = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch();
    }, 200);
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');
      const apiRes = await searchInstruments(query);
      const instruments = parseApiResult(apiRes);
      setRawResults(instruments);
    } catch (err) {
      setError(err?.message || "Search failed");
      setRawResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstrumentPress = (instrument) => {
    navigation.navigate("InstrumentDetailScreen", { instrument });
  };

  const onChangeQuery = (text) => {
    setQuery(text);
    triggerSearch();
  };

  const renderItem = ({ item, index }) => {
    const ex = getExchange(item);
    const sym = getSymbolRaw(item);
    const displayName = formatInstrumentName(item);
    const token = String(item.instrument_token ?? item.token ?? index);
    const rawPrice =
      livePrices && livePrices[token] !== undefined
        ? livePrices[token]
        : item.last_price ?? item.close ?? "—";
    const price = rawPrice === "—" ? "—" : Number(rawPrice);

    const secondary = [sym, getName(item)].filter(Boolean).join(" • ");

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handleInstrumentPress(item)}
      >
        <View style={{ flexDirection: "column", flex: 1 }}>
          <Text style={styles.symbol}>
            {displayName || sym}
            {!!ex && (
              <Text style={[styles.exchange, { color: getExchangeColor(ex) }]}>
                {`  - ${ex}`}
              </Text>
            )}
          </Text>
          {!!secondary && <Text style={styles.meta}>{secondary}</Text>}
        </View>
        <Text style={styles.price}>{price === "—" ? "—" : `₹${price}`}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>{"←"}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Search instrument</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search instrument (e.g., NIFTY 09th SEP 22600 CE, RELIANCE)…"
        autoCapitalize="none"
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      <Button title="Search" onPress={handleSearch} />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={rankedResults}
        keyExtractor={(item, idx) =>
          String(item.instrument_token || `${getSymbolRaw(item)}-${getExchange(item)}-${idx}`)
        }
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && (
            <Text style={{ marginTop: 20, color: "#888" }}>
              No instruments found.
            </Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 1,
    padding: 6,
  },
  backText: {
    fontSize: 28,
    color: "#222",
    fontWeight: "bold",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12, alignSelf: 'center', marginTop: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 8, marginBottom: 8, marginTop: 10 },
  error: { color: "red", marginBottom: 8 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  symbol: { fontSize: 15, fontWeight: "bold", color: "#111" },
  exchange: { fontSize: 15, fontWeight: "bold" },
  meta: { fontSize: 12.5, color: "#666", marginTop: 2 },
  price: { fontSize: 15, color: "#1e90ff", marginLeft: 10 },
});

export default SearchScreen;