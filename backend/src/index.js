import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";

import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import storiesRoutes from "./routes/stories.js";
import futureDropsRoutes from "./routes/futureDrops.js";
import liveRoutes from "./routes/live.js";
import famRoutes from "./routes/fam.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "*";

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// static uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// health
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "gacuriro-api" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/future-drops", futureDropsRoutes);
app.use("/api/live", liveRoutes);
app.use("/api/fam", famRoutes);

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map(); // userId -> socketId

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user:online", (userId) => {
    if (!userId) return;
    onlineUsers.set(String(userId), socket.id);
    socket.userId = String(userId);
    console.log("User online:", userId, "->", socket.id);
  });

  socket.on("call:invite", (payload) => {
    const targets = payload?.to || payload?.targets || [];
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
    const sid = onlineUsers.get(String(to));
    if (sid) io.to(sid).emit("call:end", { from: socket.userId });
  });

  socket.on("live:signal", (payload) => {
    const room = payload?.sessionId || payload?.room;
    if (room) {
      socket.to(room).emit("live:signal", {
        ...payload,
        from: socket.userId,
      });
    }
  });

  socket.on("live:join", (sessionId) => {
    if (sessionId) socket.join(String(sessionId));
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log("User offline (disconnect):", socket.userId);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

app.set("io", io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});