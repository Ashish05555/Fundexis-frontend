import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db, auth } from "../firebase";

export function useActiveTrades(account) {
  const [trades, setTrades] = useState([]);
  useEffect(() => {
    if (!account || !account.id || !auth.currentUser?.uid) {
      setTrades([]);
      return;
    }
    const tradesRef = query(
      collection(db, "users", auth.currentUser.uid, "challenges", account.id, "trades"),
      where("status", "==", "ACTIVE")
    );
    const unsub = onSnapshot(tradesRef, snap => {
      setTrades(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [account]);
  return trades;
}