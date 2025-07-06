import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";

export default function OptionChainScreen({ route }) {
  const { symbol } = route.params;
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Replace with your REST API endpoint, or use mock data here for now
    axios.get(`/api/option-chain/${symbol}`)
      .then(res => {
        setChain(res.data); // Expecting array of { strikePrice, ceOi, cePrice, pePrice, peOi }
        setLoading(false);
      })
      .catch(e => {
        setErr("Failed to load option chain");
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;
  if (err) return <Text style={styles.error}>{err}</Text>;

  return (
    <FlatList
      data={chain}
      keyExtractor={item => item.strikePrice.toString()}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.th}>Strike</Text>
          <Text style={styles.th}>CE OI</Text>
          <Text style={styles.th}>CE Price</Text>
          <Text style={styles.th}>PE Price</Text>
          <Text style={styles.th}>PE OI</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.cell}>{item.strikePrice}</Text>
          <Text style={styles.cell}>{item.ceOi}</Text>
          <Text style={styles.cell}>{item.cePrice}</Text>
          <Text style={styles.cell}>{item.pePrice}</Text>
          <Text style={styles.cell}>{item.peOi}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", backgroundColor: "#eee", padding: 8 },
  th: { flex: 1, fontWeight: "bold", textAlign: "center" },
  row: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
  cell: { flex: 1, textAlign: "center" },
  error: { textAlign: "center", color: "red", marginTop: 30 }
});