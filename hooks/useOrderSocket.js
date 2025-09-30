import { useEffect } from "react";
import socket from "../utils/socketSetup";

export function useOrderSocket({ userId, onOrderUpdate }) {
  useEffect(() => {
    if (!userId) return;

    socket.on("connect", () => {
      console.log("Socket connected!", socket.id);
    });
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
    socket.on("connect_error", (err) => {
      console.log("Socket connection failed:", err.message);
    });

    // Listen for order updates
    socket.on("order_update", (data) => {
      if (onOrderUpdate) onOrderUpdate(data);
    });
    socket.on("trade_exited", (data) => {
      if (onOrderUpdate) onOrderUpdate(data);
    });
    socket.on("order_cancelled", (data) => {
      if (onOrderUpdate) onOrderUpdate(data);
    });

    // Optionally send userId to backend (if needed for auth/user-specific updates)
    socket.emit("setUserId", userId);

    return () => {
      socket.off("order_update");
      socket.off("trade_exited");
      socket.off("order_cancelled");
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      // Do not disconnect the socket here if you use a shared instance!
    };
  }, [userId, onOrderUpdate]);
}