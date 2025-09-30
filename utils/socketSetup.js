import { io } from "socket.io-client";

// Load from environment for maximum flexibility
// If not using REACT_APP_SOCKET_URL, fallback to hardcoded Cloud Run URL
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "https://fundexis-backend-758832599619.us-central1.run.app";

// Debug: Print which socket URL is being used at runtime!
console.log("Connecting to SOCKET_URL:", SOCKET_URL);

const socket = io(SOCKET_URL, {
  transports: ["websocket"], // Only websocket for Cloud Run
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Debug connection events
socket.on("connect", () => {
  console.log("Socket connected!", socket.id);
});
socket.on("disconnect", () => {
  console.log("Socket disconnected!");
});
socket.on("connect_error", (err) => {
  console.error("Socket connection error:", err);
});

export default socket;