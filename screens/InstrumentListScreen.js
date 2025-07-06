import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, Text, Modal, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";

// Example/mock data (replace with your actual search/list data)
const mockInstruments = [
  { instrument_token: 1, tradingsymbol: "CDSL25JUN1700CE", name: "CDSL 26 Jun 1700 Call", last_price: 20.60 },
  { instrument_token: 2, tradingsymbol: "TCS", name: "Tata Consultancy", last_price: 3931.20 },
  { instrument_token: 3, tradingsymbol: "RELIANCE", name: "Reliance Industries Ltd", last_price: 3145.25 },
];

export default function InstrumentListScreen() {
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const navigation = useNavigation();

  const handleAction = (side) => {
    setSelectedInstrument(null); // close sheet
    navigation.navigate("OrderScreen", {
      instrument: selectedInstrument,
      side,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <FlatList
        data={mockInstruments}
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
          </TouchableOpacity>
        )}
      />

      {/* Inline modal instead of InstrumentDetailsSheet */}
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