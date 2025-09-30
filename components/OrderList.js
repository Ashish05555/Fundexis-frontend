import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { FlatList, Text, View, ActivityIndicator } from "react-native";

export default function OrderList({ challengeId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      const userUid = auth.currentUser.uid;
      const ordersRef = collection(db, "users", userUid, "challenges", challengeId, "orders");
      const snapshot = await getDocs(ordersRef);
      setOrders(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    }
    if (challengeId) {
      fetchOrders();
    }
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