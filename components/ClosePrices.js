import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import useLivePrices from '../hooks/useLivePrices';

// Replace this with your actual instrument list source.
import instrumentsList from '../data/instruments.json'; // Example path

const ClosePrices = () => {
  // Get the list of instrument tokens
  const instrumentTokens = instrumentsList.map(item => item.instrument_token);
  // Fetch live prices for all tokens
  const livePrices = useLivePrices(instrumentTokens);

  const [loading, setLoading] = useState(true);

  // Loading logic: Wait until livePrices are populated for all tokens
  useEffect(() => {
    if (instrumentTokens.every(token => livePrices[token] !== undefined)) {
      setLoading(false);
    }
  }, [livePrices, instrumentTokens]);

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  const dataWithPrice = instrumentsList.map(item => ({
    ...item,
    last_price: livePrices[item.instrument_token]
  }));

  const renderPrice = (item) => {
    if (item.last_price !== undefined && item.last_price !== null) {
      return `₹${item.last_price}`;
    } else {
      return "No price";
    }
  };

  return (
    <FlatList
      data={dataWithPrice}
      keyExtractor={(item) => item.instrument_token.toString()}
      ListHeaderComponent={() => (
        <View style={styles.row}>
          <Text style={[styles.cell, styles.header]}>Symbol</Text>
          <Text style={[styles.cell, styles.header]}>Name</Text>
          <Text style={[styles.cell, styles.header]}>Price</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.cell}>{item.tradingsymbol}</Text>
          <Text style={styles.cell}>{item.name}</Text>
          <Text style={styles.cell}>{renderPrice(item)}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  cell: { flex: 1, textAlign: 'center' },
  header: { fontWeight: 'bold', color: '#222' },
});

export default ClosePrices;