import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import axios from "axios";

export default function FuturesScreen({ route }) {
  const { symbol } = route.params;
  const [futures, setFutures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Replace with your REST API endpoint, or use mock data here for now
    axios.get(`/api/futures/${symbol}`)
      .then(res => {
        setFutures(res.data); // Expecting array of { expiry, lastPrice, oi, change }
        setLoading(false);
      })
      .catch(e => {
        setErr("Failed to load futures data");
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;
  if (err) return <Text style={styles.error}>{err}</Text>;

  return (
    <FlatList
      data={futures}
      keyExtractor={item => item.expiry}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.th}>Expiry</Text>
          <Text style={styles.th}>LTP</Text>
          <Text style={styles.th}>OI</Text>
          <Text style={styles.th}>Change</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.cell}>{item.expiry}</Text>
          <Text style={styles.cell}>{item.lastPrice}</Text>
          <Text style={styles.cell}>{item.oi}</Text>
          <Text style={styles.cell}>{item.change}</Text>
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