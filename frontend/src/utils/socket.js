import { io } from "socket.io-client";
import { API_URL } from "./api";

let socket = null;

function showLocalNotification(title, body, data = {}) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/logo192.png",
      badge: "/logo192.png",
      data,
    });
  } catch (e) {}
}

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
    console.log("Socket connected to API:", API_URL, socket.id);
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

  socket.on("call:incoming", (payload) => {
    showLocalNotification(
      "Incoming call",
      payload?.fromName || "Someone is calling you",
      { type: "call" }
    );
  });

  socket.on("message:new", (payload) => {
    showLocalNotification(
      payload?.fromName || "New message",
      payload?.text || "Open Gacuriro Fam",
      { type: "message" }
    );
  });

  socket.on("notify", (p) => {
    showLocalNotification(
      p?.fromName || "Gacuriro Fam",
      p?.text || "New activity",
      { type: p?.type || "notify", postId: p?.postId }
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

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
};