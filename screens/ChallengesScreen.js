import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";

// Custom challenges with updated names and correct fees
const challenges = [
  {
    id: "1",
    title: "Basic Challenge",
    funding: 100000,
    fee: 4000,
    profitTarget: "10%",
    maxLoss: "10%",
  },
  {
    id: "2",
    title: "Standard Challenge",
    funding: 500000,
    fee: 15000, // Corrected fee
    profitTarget: "10%",
    maxLoss: "10%",
  },
  {
    id: "3",
    title: "Premium Challenge",
    funding: 1000000,
    fee: 25000,
    profitTarget: "10%",
    maxLoss: "10%",
  },
];

export default function ChallengesScreen() {
  const handleBuy = (challenge) => {
    // Add your purchase logic here
    alert(`You selected the ${challenge.title}!`);
  };

  const renderChallenge = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.challengeName}>{item.title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Funding:</Text>
        <Text style={styles.value}>₹{item.funding.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Fee:</Text>
        <Text style={styles.value}>₹{item.fee.toLocaleString()}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Profit Target:</Text>
        <Text style={styles.value}>{item.profitTarget}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Maximum Loss:</Text>
        <Text style={styles.value}>{item.maxLoss}</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => handleBuy(item)}>
        <Text style={styles.buttonText}>Buy Challenge</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Challenges</Text>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        renderItem={renderChallenge}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7faff", paddingHorizontal: 16, paddingTop: 30 },
  header: { fontSize: 26, fontWeight: "bold", color: "#007AFF", marginBottom: 20, alignSelf: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  challengeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4A148C",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 1,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 16, color: "#555" },
  value: { fontSize: 16, fontWeight: "600", color: "#007AFF" },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});