import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';

// Replace with API/context calls as needed
const mockFetchUser = async () => {
  // Simulate async fetch
  return {
    name: "Ashish",
    hasChallenge: true,
    stats: {
      totalTrades: 23,
      profit: 7600,
      winRate: 68,
    },
    activeChallengeId: "1",
  };
};

export default function HomeScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const data = await mockFetchUser();
      setUser(data);
    })();
  }, []);

  if (!user) return <ActivityIndicator style={{ flex: 1 }} />;

  const { name, hasChallenge, stats } = user;

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>
        Welcome, <Text style={styles.username}>{name}</Text>!
      </Text>
      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#e0f7fa' }]}
          onPress={() => navigation.navigate('DemoTrading')}
        >
          <Text style={styles.cardTitle}>Start Trading</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#ffe0b2' }]}
          onPress={() => navigation.navigate('Challenges')}
        >
          <Text style={styles.cardTitle}>Buy a Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: '#e1bee7' }]}
          onPress={() => {
            if (!hasChallenge) navigation.navigate('Challenges');
            else Alert.alert("Statistics", "Stats shown below.");
          }}
        >
          <Text style={styles.cardTitle}>View Statistics</Text>
          {hasChallenge ? (
            <View style={styles.statsBox}>
              <Text style={styles.statsText}>Total Trades: {stats.totalTrades}</Text>
              <Text style={styles.statsText}>Profit: ₹{stats.profit}</Text>
              <Text style={styles.statsText}>Win Rate: {stats.winRate}%</Text>
            </View>
          ) : (
            <Text style={styles.buyPrompt}>Buy a challenge to view your stats!</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  welcome: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 24,
    marginBottom: 20,
    color: "#222",
  },
  username: { color: "#007AFF" },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    minHeight: 120,
  },
  cardTitle: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 10 },
  statsBox: { alignItems: "center" },
  statsText: { fontSize: 16, color: "#222" },
  buyPrompt: { fontSize: 16, color: "#b00", textAlign: "center" },
});