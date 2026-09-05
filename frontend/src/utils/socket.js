import { io } from "socket.io-client";
import { API_URL } from "../config";

let socket = null;

export function connectSocket(userId) {
  if (!userId) return null;

  if (socket?.connected) {
    socket.emit("user:online", String(userId));
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    transports: ["polling", "websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 15000,
  });

  socket.on("connect", () => {
    console.log("Socket connected to API:", API_URL, socket.id);
    socket.emit("user:online", String(userId));
  });

  socket.on("connect_error", (err) => {
    console.log("Socket connect_error:", err.message);
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected");
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

const socketApi = {
  connectSocket,
  getSocket,
  disconnectSocket,
};

export default socketApi;