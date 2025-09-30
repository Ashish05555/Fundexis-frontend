import React, { useState } from "react";
import { View, Text, TextInput, Button, TouchableOpacity, StyleSheet, Picker, Alert } from "react-native";

const ORDER_TYPES = ["MARKET", "LIMIT", "SL", "SLM"];
const TRIGGER_TYPES = ["single", "OCO"];

export default function GttOrderForm({ onCreate }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [orderType, setOrderType] = useState("MARKET");
  const [triggerType, setTriggerType] = useState("single");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [targetTriggerPrice, setTargetTriggerPrice] = useState("");
  const [stoplossTriggerPrice, setStoplossTriggerPrice] = useState("");
  const [expiry, setExpiry] = useState("");

  function handleSubmit() {
    if (!symbol || !quantity || !expiry || 
      (triggerType === "single" && !triggerPrice) || 
      (triggerType === "OCO" && (!targetTriggerPrice || !stoplossTriggerPrice))) {
      Alert.alert("Fill all fields!");
      return;
    }
    const data = {
      symbol,
      side,
      quantity: Number(quantity),
      orderType,
      triggerType,
      triggerPrice: triggerType === "single" ? Number(triggerPrice) : null,
      targetTriggerPrice: triggerType === "OCO" ? Number(targetTriggerPrice) : null,
      stoplossTriggerPrice: triggerType === "OCO" ? Number(stoplossTriggerPrice) : null,
      expiry,
    };
    onCreate(data);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Create GTT Order</Text>
      <TextInput
        style={styles.input}
        placeholder="Symbol"
        value={symbol}
        onChangeText={setSymbol}
      />
      <View style={styles.row}>
        <Text>Side:</Text>
        <Picker
          selectedValue={side}
          style={styles.picker}
          onValueChange={setSide}
        >
          <Picker.Item label="BUY" value="BUY" />
          <Picker.Item label="SELL" value="SELL" />
        </Picker>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Quantity"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
      />
      <View style={styles.row}>
        <Text>Order Type:</Text>
        <Picker
          selectedValue={orderType}
          style={styles.picker}
          onValueChange={setOrderType}
        >
          {ORDER_TYPES.map(type => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>
      <View style={styles.row}>
        <Text>Trigger Type:</Text>
        <Picker
          selectedValue={triggerType}
          style={styles.picker}
          onValueChange={setTriggerType}
        >
          {TRIGGER_TYPES.map(type => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>
      {triggerType === "single" ? (
        <TextInput
          style={styles.input}
          placeholder="Trigger Price"
          keyboardType="numeric"
          value={triggerPrice}
          onChangeText={setTriggerPrice}
        />
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Target Trigger Price"
            keyboardType="numeric"
            value={targetTriggerPrice}
            onChangeText={setTargetTriggerPrice}
          />
          <TextInput
            style={styles.input}
            placeholder="Stoploss Trigger Price"
            keyboardType="numeric"
            value={stoplossTriggerPrice}
            onChangeText={setStoplossTriggerPrice}
          />
        </>
      )}
      <TextInput
        style={styles.input}
        placeholder="Expiry (YYYY-MM-DD)"
        value={expiry}
        onChangeText={setExpiry}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={{ color: "white", fontWeight: "bold" }}>Place GTT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 12 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 8, marginBottom: 10, borderRadius: 5 },
  picker: { height: 40, width: 120 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  button: { backgroundColor: "#2e7d32", padding: 14, borderRadius: 5, alignItems: "center", marginTop: 8 }
});