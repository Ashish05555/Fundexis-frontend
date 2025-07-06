import React, { useEffect, useState } from "react";
import { View, Text, Dimensions, StyleSheet, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-chart-kit";
import axios from "axios";

export default function TechnicalChartScreen({ route }) {
  const { symbol } = route.params;
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    // Replace with your REST API endpoint, or use mock data here for now
    axios.get(`/api/instruments/${symbol}/historical?interval=5m`)
      .then(res => {
        setChartData(res.data); // Array of { time, close }
        setLoading(false);
      })
      .catch(e => {
        setErr("Failed to load chart data");
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return <ActivityIndicator style={{ marginTop: 30 }} />;
  if (err) return <Text style={styles.error}>{err}</Text>;
  if (chartData.length === 0) return <Text style={styles.error}>No chart data</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{symbol} Technical Chart</Text>
      <LineChart
        data={{
          labels: chartData.map((c, i) => i % 10 === 0 ? c.time : ""), // Show fewer labels
          datasets: [{ data: chartData.map(c => c.close) }]
        }}
        width={Dimensions.get("window").width - 24}
        height={220}
        chartConfig={{
          backgroundGradientFrom: "#fff",
          backgroundGradientTo: "#fff",
          decimalPlaces: 2,
          color: () => "#1976D2",
        }}
        bezier
        style={{ borderRadius: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12 },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 8 },
  error: { textAlign: "center", color: "red", marginTop: 30 }
});