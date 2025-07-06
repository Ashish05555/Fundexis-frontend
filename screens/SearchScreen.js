import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { searchInstruments } from '../services/apiService'; // Ensure this path matches your folder structure
import InstrumentDetailsSheet from './InstrumentDetailsSheet'; // Adjust path if needed
import { useNavigation } from '@react-navigation/native';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState(null);

  const navigation = useNavigation();

  const handleSearch = async () => {
    try {
      setError('');
      const instruments = await searchInstruments(query);
      setResults(instruments);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBuy = () => {
    navigation.navigate("OrderScreen", { instrument: selectedInstrument, side: "BUY" });
    setSelectedInstrument(null);
  };
  const handleSell = () => {
    navigation.navigate("OrderScreen", { instrument: selectedInstrument, side: "SELL" });
    setSelectedInstrument(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search Instruments</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Enter instrument name or symbol"
      />
      <Button title="Search" onPress={handleSearch} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item.instrument_token.toString()}
        renderItem={({ item }) => (
          <Text
            style={styles.item}
            onPress={() => setSelectedInstrument(item)}
          >
            {item.tradingsymbol} - {item.name}
          </Text>
        )}
      />
      <InstrumentDetailsSheet
        visible={!!selectedInstrument}
        instrument={selectedInstrument}
        onClose={() => setSelectedInstrument(null)}
        onBuy={handleBuy}
        onSell={handleSell}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 8, marginBottom: 8 },
  error: { color: "red", marginBottom: 8 },
  item: { padding: 14, borderBottomColor: "#eee", borderBottomWidth: 1, fontSize: 16 }
});

export default SearchScreen;