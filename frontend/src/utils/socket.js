import { io } from "socket.io-client";
import { API_URL } from "./api";

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(userId) {
  if (!userId) return null;

  if (socket?.connected) {
    socket.emit("user:online", String(userId));
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", API_URL, socket.id);
    socket.emit("user:online", String(userId));
  });

  socket.on("reconnect", () => {
    socket.emit("user:online", String(userId));
  });

  socket.on("connect_error", (err) => {
    console.log("Socket connect_error:", err?.message || err);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnect:", reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

const socketApi = {
  getSocket,
  connectSocket,
  disconnectSocket,
};

export default socketApi;