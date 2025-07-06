import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarketStatusBar() {
  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>Market Status</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1976d2',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});