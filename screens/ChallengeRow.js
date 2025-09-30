import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const statusMap = {
  ACTIVE: { label: 'ACTIVE', bg: '#2563EB', text: '#fff' },
  CAUTION: { label: 'CAUTION', bg: '#F59E00', text: '#fff' },
  BREACHED: { label: 'BREACHED', bg: '#DC2626', text: '#fff' },
  PASSED: { label: 'COMPLETED', bg: '#16A34A', text: '#fff' },
  FAILED: { label: 'FAILED', bg: '#9CA3AF', text: '#fff' },
};

function formatCurrency(n) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function ChallengeRow({ challenge, onPress }) {
  const status = statusMap[challenge.status] || statusMap.ACTIVE;
  // Example: Current % logic (customize as per your actual calculation)
  const currentPct = challenge.currentPct || ((challenge.netPnl / challenge.target) * 100).toFixed(0);
  const currentPctColor = currentPct < 0 ? '#DC2626' : '#2563EB';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.93} onPress={() => onPress(challenge.id)}>
      <View style={styles.topRow}>
        <Text style={styles.title}>
          {challenge.title} <Text style={styles.code}>#{challenge.id}</Text>
        </Text>
        <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Target:</Text>
          <Text style={styles.metaValue}>{formatCurrency(challenge.target)}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Current</Text>
          <Text style={[styles.metaValue, { color: currentPct < 0 ? '#DC2626' : '#2563EB' }]}>
            {currentPct}%
          </Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Trades</Text>
          <Text style={styles.metaValue}>{challenge.trades}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginVertical: 9,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
  },
  code: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  statusText: {
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  metaCol: {
    flex: 1,
    alignItems: 'flex-start',
    marginRight: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: '#838383',
    fontWeight: '600',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    color: '#222',
    fontWeight: '700',
  },
});