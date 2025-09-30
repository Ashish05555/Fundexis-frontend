import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useChallenge } from "../context/ChallengeContext";

// Helper: Get phase label for a challenge account
function getPhaseLabel(account) {
  if (!account) return "";
  if (account.phase === 1) return "Phase 1";
  if (account.phase === 2) return "Phase 2";
  if (account.phaseOneCompleted && account.phaseTwoCompleted) return "Funded Account";
  return "Phase 1";
}

// Helper: Format challenge label
function getChallengeLabel(account) {
  if (!account) return "";
  if (account.type === "5L") return "5 Lakh Challenge";
  if (account.type === "10L") return "10 Lakh Challenge";
  if (account.type === "1L") return "1 Lakh Challenge";
  return account.title || "";
}

// Helper: Get hashtag code (last 5 digits from account.title)
function getHashtag(account) {
  if (!account || !account.title) return "00000";
  const match = account.title.match(/#(\d{5})/);
  return match ? match[1] : "00000";
}

export default function AccountSelector() {
  const { selectedChallenge, demoAccounts, setSelectedChallenge } = useChallenge();
  const [modalVisible, setModalVisible] = useState(false);

  // Debug: Log accounts to check if both are present
  console.log("demoAccounts:", demoAccounts);

  const handleSelect = (account) => {
    setSelectedChallenge(account);
    setModalVisible(false);
  };

  // Only show accounts with a title, avoid errors
  const validAccounts = Array.isArray(demoAccounts)
    ? demoAccounts.filter(acc => acc && acc.title)
    : [];

  const renderAccountCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.accountCard,
        selectedChallenge?.title === item?.title && styles.selectedCard
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.9}
      disabled={!item || !item.title}
    >
      <View style={styles.cardContent}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="trophy-award" size={30} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.accountTitle}>
            {getChallengeLabel(item)} <Text style={styles.hashtag}>#{getHashtag(item)}</Text>
          </Text>
          <Text style={styles.phaseLabel}>{getPhaseLabel(item)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons name="account-switch" size={22} color="#2540F6" />
        <Text style={styles.selectorText}>
          {selectedChallenge && selectedChallenge.title
            ? `${getChallengeLabel(selectedChallenge)} #${getHashtag(selectedChallenge)} (${getPhaseLabel(selectedChallenge)})`
            : "Select Account"}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={24} color="#2540F6" />
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Select Trading Account</Text>
            <FlatList
              data={validAccounts}
              renderItem={renderAccountCard}
              keyExtractor={(item) => item.title}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text style={{ color: "#888", textAlign: "center", marginVertical: 25 }}>
                  No active accounts found.
                </Text>
              }
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eef3fd",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    elevation: 2,
    marginBottom: 6,
    marginTop: 26,
    alignSelf: "center",
  },
  selectorText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2540F6",
    marginLeft: 10,
    marginRight: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(18,18,18,0.17)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "88%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    elevation: 11,
    shadowColor: "#2540F6",
    shadowOpacity: 0.19,
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 18,
  },
  modalHeader: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2540F6",
    marginBottom: 16,
    textAlign: "center",
  },
  accountCard: {
    borderRadius: 14,
    marginBottom: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#eef3fd",
    elevation: 4,
    backgroundColor: "#fff", // No gradient, just white
  },
  selectedCard: {
    borderColor: "#2540F6",
    backgroundColor: "#f0f8ff",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 14,
  },
  iconWrap: {
    backgroundColor: "#2540F6",
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  accountTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#2540F6",
    marginBottom: 2,
  },
  hashtag: {
    fontSize: 16,
    color: "#fbc02d",
    fontWeight: "600",
    marginLeft: 7,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#388e3c",
    marginTop: 2,
  },
  closeButton: {
    backgroundColor: "#2540F6",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 11,
    marginTop: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});