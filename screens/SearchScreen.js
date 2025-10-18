/**
 * SearchScreen.js
 *
 * - Zerodha-like instrument search UI for search results.
 * - Props:
 *    - onSelect?: function(instrument) => void  // optional; if provided, called when a row is pressed. Otherwise navigates to "InstrumentDetailScreen".
 * - Data dependency for each instrument object:
 *    {
 *      id?: string,
 *      token?: number | string,
 *      name?: string,
 *      symbol?: string,
 *      exchange?: 'NSE' | 'BSE' | 'NFO',
 *      isDeriv?: boolean,
 *      lastPrice?: number
 *    }
 */

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
import PropTypes from 'prop-types';
import { useNavigation } from '@react-navigation/native';

import { searchInstruments } from '../services/apiService';
import { LivePriceProvider, useLivePrices } from "../context/LivePriceProvider";
import { formatInstrumentName, buildSearchKeywords } from "../utils/instrumentName";
import { useTheme } from '../context/ThemeContext';

const NSE_RED = "#FF5C5C";
const BSE_BLUE = "#3B82F6";

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
  if (raw.includes("NFO")) return "NFO";
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

  if (displayName === q) score += 11000;
  if (displayName.startsWith(q)) score += 6500;
  if (displayName.includes(q)) score += 1400;

  if (keywords.includes(q)) score += 10500;
  if (keywords.some(k => k.startsWith(q))) score += 6200;
  if (keywords.some(k => k.includes(q))) score += 1300;

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

const parseApiResult = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.instruments)) return res.instruments;
  return [];
};

// --- Price formatting helper ---
export function formatPrice(inst, lastPrice) {
  const isNFO = inst.isDeriv === true || getExchange(inst) === "NFO";
  if (lastPrice === null || lastPrice === undefined || lastPrice === "—") return "—";
  if (isNFO) return `${lastPrice}`;
  return `₹ ${lastPrice}`;
}

// --- ExchangeTag component ---
export function ExchangeTag({ exchange, theme }) {
  if (exchange === "NFO") return null;
  const isDark = theme.mode === 'dark';
  let bgColor, borderColor, textColor;
  if (exchange === "NSE") {
    bgColor = isDark ? "rgba(255,92,92,0.12)" : "#FFEEEE";
    borderColor = NSE_RED;
    textColor = NSE_RED;
  } else if (exchange === "BSE") {
    bgColor = isDark ? "rgba(59,130,246,0.12)" : "#E9F3FF";
    borderColor = BSE_BLUE;
    textColor = BSE_BLUE;
  }
  return (
    <View
      style={{
        backgroundColor: bgColor,
        borderWidth: 1,
        borderColor,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
        alignSelf: 'center',
      }}
      accessible
      accessibilityLabel={`Exchange: ${exchange}`}
    >
      <Text style={{ fontSize: 12, color: textColor, fontWeight: '600' }}>{exchange}</Text>
    </View>
  );
}

ExchangeTag.propTypes = {
  exchange: PropTypes.string,
  theme: PropTypes.object.isRequired,
};

// --- Row component ---
function InstrumentRow({ instrument, price, onPress, theme }) {
  const ex = getExchange(instrument);
  const showTag = !(instrument.isDeriv === true || ex === "NFO");
  const [pressed, setPressed] = useState(false);
  const rowBg = pressed
    ? (theme.mode === 'dark'
        ? theme.brand + '22'
        : theme.brand + '11')
    : theme.card;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.item,
        {
          backgroundColor: rowBg,
          borderBottomColor: theme.divider,
        }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${getName(instrument)}, ${showTag ? ex : ''}, Price ${formatPrice(instrument, price)}`}
    >
      {/* Left: Name + Tag */}
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Text
          style={[
            styles.instrumentName,
            { color: theme.text, fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {formatInstrumentName(instrument) || getSymbolRaw(instrument)}
        </Text>
        {showTag && <ExchangeTag exchange={ex} theme={theme} />}
      </View>
      {/* Right: Price */}
      <View style={{ minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text
          style={[
            styles.priceText,
            { color: theme.text, fontWeight: '700' },
          ]}
          numberOfLines={1}
        >
          {formatPrice(instrument, price)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

InstrumentRow.propTypes = {
  instrument: PropTypes.object.isRequired,
  price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onPress: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
};

// --- Main SearchScreen ---
const SearchScreen = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigation = useNavigation();
  const theme = useTheme();

  const rankedResults = useMemo(() => {
    return rankAndFilterInstruments(query, rawResults, {
      limit: 200,
      preferNSEWithinPair: true,
    });
  }, [query, rawResults]);

  const tokens = useMemo(
    () => rankedResults.slice(0, 20).map(inst => String(inst.instrument_token ?? inst.token ?? "")).filter(Boolean),
    [rankedResults]
  );

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
    if (typeof onSelect === 'function') {
      onSelect(instrument);
    } else {
      navigation.navigate("InstrumentDetailScreen", { instrument });
    }
  };

  const onChangeQuery = (text) => {
    setQuery(text);
    triggerSearch();
  };

  const ResultsList = React.useCallback(() => {
    const livePrices = useLivePrices(tokens);

    const renderItem = ({ item, index }) => {
      const token = String(item.instrument_token ?? item.token ?? index);
      const priceObj = livePrices && livePrices[token];

      const rawPrice =
        priceObj && priceObj.price !== undefined && priceObj.price !== null
          ? priceObj.price
          : item.last_price ?? item.close ?? "—";
      const price =
        rawPrice === "—" || rawPrice === undefined || rawPrice === null
          ? "—"
          : Number(rawPrice);

      return (
        <InstrumentRow
          instrument={item}
          price={price}
          onPress={() => handleInstrumentPress(item)}
          theme={theme}
        />
      );
    };

    if (loading) {
      return (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={i => String(i)}
          renderItem={() => <SkeletonRow theme={theme} />}
          keyboardShouldPersistTaps="handled"
        />
      );
    }

    return (
      <FlatList
        data={rankedResults}
        keyExtractor={(item, idx) =>
          String(item.instrument_token || `${getSymbolRaw(item)}-${getExchange(item)}-${idx}`)
        }
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && (
            <Text style={{ marginTop: 20, color: theme.textDim || "#888" }}>
              No instruments found.
            </Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    );
  }, [rankedResults, tokens, loading, navigation, theme, onSelect]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
        <Text style={[styles.backText, { color: theme.text }]}>{"←"}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, { color: theme.text }]}>Search instrument</Text>
      <TextInput
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: theme.divider }]}
        value={query}
        onChangeText={onChangeQuery}
        placeholder="Search instrument (e.g., NIFTY 09th SEP 22600 CE, RELIANCE)…"
        autoCapitalize="none"
        placeholderTextColor={theme.textDim || "#888"}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />
      <Button title="Search" onPress={handleSearch} color={theme.brand} />
      {loading && <ActivityIndicator style={{ marginTop: 10 }} color={theme.brand} />}
      {error ? <Text style={[styles.error, { color: theme.error || "red" }]}>{error}</Text> : null}

      <LivePriceProvider tokens={tokens}>
        <ResultsList />
      </LivePriceProvider>
    </View>
  );
};

SearchScreen.propTypes = {
  onSelect: PropTypes.func,
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  backButton: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 1,
    padding: 6,
  },
  backText: {
    fontSize: 28,
    fontWeight: "bold",
  },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12, alignSelf: 'center', marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 5, padding: 8, marginBottom: 8, marginTop: 10 },
  error: { marginBottom: 8 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  instrumentName: {
    fontSize: 17,
    flexShrink: 1,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  skelBox: {
    borderRadius: 6,
    opacity: 0.25,
    marginVertical: 2,
  },
});

export default SearchScreen;