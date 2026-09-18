import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import postsRoutes, { setPostsRealtime } from "./routes/posts.js";
import messagesRoutes from "./routes/messages.js";
import storiesRoutes from "./routes/stories.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map(); // userId -> socketId

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/health", (req, res) => {
  res.json({ ok: true, online: onlineUsers.size, time: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/stories", storiesRoutes);

setPostsRealtime(io, onlineUsers);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user:online", (userId) => {
    if (!userId) return;
    const id = String(userId);
    onlineUsers.set(id, socket.id);
    socket.userId = id;
    console.log("User online:", id, "->", socket.id);
  });

  socket.on("call:invite", (payload) => {
    const targets = payload?.to || [];
    const list = Array.isArray(targets) ? targets : [targets];
    let sent = 0;
    list.forEach((uid) => {
      const sid = onlineUsers.get(String(uid));
      if (sid) {
        io.to(sid).emit("call:incoming", {
          ...payload,
          from: socket.userId,
        });
        sent++;
      }
    });
    if (!sent) {
      console.log("Call: no online targets", list);
      socket.emit("call:unavailable", { targets: list });
    }
  });

  socket.on("call:signal", (payload) => {
    const to = payload?.to;
    if (!to) return;
    const sid = onlineUsers.get(String(to));
    if (sid) {
      io.to(sid).emit("call:signal", {
        ...payload,
        from: socket.userId,
      });
    }
  });

  socket.on("call:end", (payload) => {
    const to = payload?.to;
    if (!to) return;
    const sid = onlineUsers.get(String(to));
    if (sid) io.to(sid).emit("call:end", { from: socket.userId });
  });

  socket.on("message:new", (payload) => {
    // optional client relay; prefer server emit after DB save
    const to = payload?.to || payload?.receiverId;
    if (to) {
      const sid = onlineUsers.get(String(to));
      if (sid) io.to(sid).emit("message:new", payload);
    }
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      const current = onlineUsers.get(socket.userId);
      if (current === socket.id) onlineUsers.delete(socket.userId);
      console.log("User offline:", socket.userId);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});