import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { supabase } from "./config/supabase.js";

import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import postsRoutes from "./routes/posts.js";
import storiesRoutes from "./routes/stories.js";
import messagesRoutes from "./routes/messages.js";
import notificationsRoutes from "./routes/notifications.js";
import callsRoutes from "./routes/calls.js";
import famLinksRoutes from "./routes/famLinks.js";
import futureDropsRoutes from "./routes/futureDrops.js";
import liveRoutes from "./routes/live.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
  transports: ["polling", "websocket"],
  allowEIO3: true,
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/", (_req, res) => res.json({ ok: true, db: "supabase" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/fam-links", famLinksRoutes);
app.use("/api/future-drops", futureDropsRoutes);
app.use("/api/live", liveRoutes);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("user:online", async (userId) => {
    if (!userId) return;
    const id = String(userId);
    onlineUsers.set(id, socket.id);
    socket.userId = id;
    console.log("User online:", id, "->", socket.id);

    try {
      const { data: missed } = await supabase
        .from("call_logs")
        .select("*")
        .eq("callee_id", id)
        .eq("status", "missed")
        .eq("seen", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (missed?.length) {
        socket.emit("call:missed", { calls: missed });
      }
    } catch (e) {
      console.error("missed calls", e.message);
    }
  });

  // ——— 1:1 / group calls ———
  socket.on("call:invite", (payload) => {
    const targets = payload?.targetIds || [];
    let sent = false;
    for (const tid of targets) {
      const sid = onlineUsers.get(String(tid));
      if (sid) {
        io.to(sid).emit("call:incoming", {
          ...payload,
          fromSocketId: socket.id,
        });
        sent = true;
      }
    }
    if (!sent) {
      console.log("Call: no online targets", targets);
      socket.emit("call:error", { message: "User offline" });
    }
  });

  socket.on("call:accept", (payload) => {
    if (payload?.toSocketId) {
      io.to(payload.toSocketId).emit("call:accepted", {
        ...payload,
        fromSocketId: socket.id,
      });
    }
  });

  socket.on("call:offer", (payload) => {
    if (payload?.toSocketId) {
      io.to(payload.toSocketId).emit("call:offer", {
        sdp: payload.sdp,
        fromSocketId: socket.id,
      });
    }
  });

  socket.on("call:answer", (payload) => {
    if (payload?.toSocketId) {
      io.to(payload.toSocketId).emit("call:answer", {
        sdp: payload.sdp,
        fromSocketId: socket.id,
      });
    }
  });

  socket.on("call:ice", (payload) => {
    if (payload?.toSocketId) {
      io.to(payload.toSocketId).emit("call:ice", {
        candidate: payload.candidate,
        fromSocketId: socket.id,
      });
    }
  });

  socket.on("call:end", (payload) => {
    if (payload?.toSocketId) {
      io.to(payload.toSocketId).emit("call:end", {
        fromSocketId: socket.id,
      });
    }
  });

  // ——— Live Perspective rooms + WebRTC signal mesh ———
  socket.on("live:join", ({ sessionId, userId }) => {
    if (!sessionId) return;
    socket.join(`live:${sessionId}`);
    socket.liveSessionId = sessionId;
    socket.to(`live:${sessionId}`).emit("live:peer-joined", {
      userId,
      socketId: socket.id,
    });
  });

  socket.on("live:leave", ({ sessionId }) => {
    const room = sessionId || socket.liveSessionId;
    if (!room) return;
    socket.leave(`live:${room}`);
    socket.to(`live:${room}`).emit("live:peer-left", {
      socketId: socket.id,
      userId: socket.userId,
    });
  });

  socket.on("live:signal", ({ sessionId, toSocketId, data }) => {
    if (toSocketId) {
      io.to(toSocketId).emit("live:signal", {
        fromSocketId: socket.id,
        data,
      });
      return;
    }
    const room = sessionId || socket.liveSessionId;
    if (room) {
      socket.to(`live:${room}`).emit("live:signal", {
        fromSocketId: socket.id,
        data,
      });
    }
  });

  socket.on("live:camera-update", ({ sessionId }) => {
    const room = sessionId || socket.liveSessionId;
    if (!room) return;
    socket.to(`live:${room}`).emit("live:camera-update", {
      sessionId: room,
    });
  });

  socket.on("disconnect", () => {
    if (socket.liveSessionId) {
      socket.to(`live:${socket.liveSessionId}`).emit("live:peer-left", {
        socketId: socket.id,
        userId: socket.userId,
      });
    }
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      console.log("User offline (disconnect):", socket.userId);
    }
    console.log("Socket disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT} (Supabase DB)`);
});