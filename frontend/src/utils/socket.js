import { io } from "socket.io-client";
import { API_URL } from "./api";
import { showLocalNotification } from "../index";

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
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (e) {}
    socket = null;
  }

  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 800,
    reconnectionDelayMax: 6000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
  });

  socket.on("connect", () => {
    console.log("Socket connected", API_URL, socket.id);
    socket.emit("user:online", String(userId));
  });

  socket.on("reconnect", () => {
    socket.emit("user:online", String(userId));
  });

  socket.on("connect_error", (err) => {
    console.log("Socket error:", err?.message || err);
  });

  // Incoming call → system notification
  socket.on("call:incoming", (payload) => {
    showLocalNotification("Incoming call", payload?.fromName || "Someone is calling", {
      type: "call",
    });
  });

  socket.on("message:new", (payload) => {
    showLocalNotification(
      payload?.fromName || "New message",
      payload?.text || "Open Gacuriro Fam",
      { type: "message" }
    );
  });

  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } catch (e) {}
  socket = null;
}

export default { getSocket, connectSocket, disconnectSocket };