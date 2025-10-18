import io from "socket.io-client";

// Use REACT_APP_SOCKET_URL from .env, fallback to your DigitalOcean IP and port 9090
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "ws://159.65.157.202:9090";

// Export a singleton socket instance, or a function to get socket
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  path: "/socket.io/",
  // If you need credentials/cookies, add: withCredentials: true
  // If you need to force 'secure' for wss, add: secure: true
});

export default socket;