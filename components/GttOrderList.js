import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, StyleSheet } from "react-native";
import io from "socket.io-client";

const socket = io("http://your-server-ip:5000", { autoConnect: true });

export default function GttOrderList({ userId }) {
  const [orders, setOrders] = useState([]);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    fetch(`http://your-server-ip:5000/api/gtt-orders/${userId}`)
      .then(res => res.json())
      .then(setOrders);

    socket.on("gtt-triggered", ({ order }) => {
      setNotification(`GTT Triggered for ${order.symbol}!`);
      fetch(`http://your-server-ip:5000/api/gtt-orders/${userId}`)
        .then(res => res.json())
        .then(setOrders);
    });

    return () => {
      socket.off("gtt-triggered");
    };
  }, [userId]);

  function handleCancel(orderId) {
    fetch(`http://your-server-ip:5000/api/gtt-orders/${orderId}`, { method: "DELETE" })
      .then(res => res.json())
      .then(() => {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: "CANCELLED" } : o));
      });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>GTT Orders</Text>
      {notification ? <Text style={styles.notification}>{notification}</Text> : null}
      <FlatList
        data={orders}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>
              <Text style={{ fontWeight: "bold" }}>{item.symbol}</Text> | {item.side} | {item.orderType} | Qty: {item.quantity}
            </Text>
            <Text>
              Triggers: {item.triggerType === "single"
                ? item.triggerPrice
                : `Target: ${item.targetTriggerPrice}, SL: ${item.stoplossTriggerPrice}`}
            </Text>
            <Text>Status: {item.status}</Text>
            <Text>Expiry: {item.expiry ? item.expiry.substr(0, 10) : ""}</Text>
            {item.status === "ACTIVE" && (
              <Button title="Cancel" onPress={() => handleCancel(item._id)} />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#fff", flex: 1 },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  notification: { color: "green", marginVertical: 8 },
  item: { marginBottom: 15, padding: 10, borderWidth: 1, borderColor: "#eee", borderRadius: 5 }
});