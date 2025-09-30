import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { FlatList, Text, View, ActivityIndicator } from "react-native";

export default function OrderListRealtime({ challengeId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!challengeId) return;
    const userUid = auth.currentUser.uid;
    const ordersRef = collection(db, "users", userUid, "challenges", challengeId, "orders");
    const unsubscribe = onSnapshot(ordersRef, snapshot => {
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, [challengeId]);

  if (loading) return <ActivityIndicator />;

  return (
    <FlatList
      data={orders}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 10, borderBottomWidth: 1, borderColor: "#eee" }}>
          <Text style={{ fontWeight: "bold" }}>{item.tradingsymbol} ({item.side})</Text>
          <Text>Qty: {item.quantity} | Price: {item.price} | Status: {item.status}</Text>
          <Text>Type: {item.order_type} | Product: {item.product}</Text>
        </View>
      )}
      ListEmptyComponent={<Text>No orders placed yet.</Text>}
    />
  );
}