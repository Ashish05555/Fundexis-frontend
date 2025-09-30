import React, { useEffect, useState } from "react";
import { View, FlatList, TouchableOpacity, Text, Modal, Button, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../firebase";

export default function InstrumentListScreen() {
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "instruments"), limit(50));
    const unsub = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) =>
        data.push({ ...doc.data(), instrument_token: doc.id })
      );
      setInstruments(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching instruments:", error);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleAction = (side) => {
    setSelectedInstrument(null);
    navigation.navigate("OrderScreen", {
      instrument: selectedInstrument,
      side,
    });
  };

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, alignSelf: "center" }} />;

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        data={instruments}
        keyExtractor={(item) => item.instrument_token.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
            onPress={() => setSelectedInstrument(item)}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{item.tradingsymbol}</Text>
            <Text style={{ color: "#888" }}>{item.name}</Text>
            <Text style={{ color: "#388e3c" }}>
              ₹{item.last_price !== undefined ? item.last_price : "No price"}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={!!selectedInstrument}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInstrument(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              padding: 24,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              minHeight: 200,
            }}
          >
            {selectedInstrument && (
              <>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>{selectedInstrument.tradingsymbol}</Text>
                <Text style={{ marginVertical: 8 }}>{selectedInstrument.name}</Text>
                <Text style={{ marginBottom: 16, color: "#555" }}>
                  Last Price: ₹{selectedInstrument.last_price}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Button title="Buy" onPress={() => handleAction("BUY")} />
                  <Button title="Sell" onPress={() => handleAction("SELL")} />
                </View>
                <Button
                  title="Close"
                  color="#888"
                  onPress={() => setSelectedInstrument(null)}
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}