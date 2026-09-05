import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_r, _f, cb) => cb(null, uploadDir),
    filename: (_r, file, cb) =>
      cb(null, `msg_${Date.now()}${path.extname(file.originalname) || ".bin"}`),
  }),
  limits: { fileSize: 40 * 1024 * 1024 },
});

function shapeUser(u) {
  if (!u) return null;
  return {
    _id: u.id,
    id: u.id,
    username: u.username,
    fullName: u.full_name || "",
    avatar: u.avatar || "",
  };
}

// List my conversations (with other user name)
router.get("/", protect, async (req, res) => {
  try {
    const { data: memberships, error } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", req.user.id);

    if (error) return res.status(500).json({ message: error.message });

    const convIds = [...new Set((memberships || []).map((m) => m.conversation_id))];
    if (!convIds.length) return res.json({ conversations: [] });

    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("updated_at", { ascending: false });

    const result = [];

    for (const c of convs || []) {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", c.id);

      const otherIds = (members || [])
        .map((m) => m.user_id)
        .filter((id) => id !== req.user.id);

      let otherUser = null;
      if (otherIds.length) {
        const { data: u } = await supabase
          .from("users")
          .select("id, username, full_name, avatar")
          .eq("id", otherIds[0])
          .maybeSingle();
        otherUser = shapeUser(u);
      }

      const title =
        c.is_group && c.group_name
          ? c.group_name
          : otherUser?.username || "Chat";

      result.push({
        id: c.id,
        _id: c.id,
        isGroup: c.is_group,
        group_name: title,
        title,
        last_message: c.last_message || "",
        updatedAt: c.updated_at,
        otherUser,
        otherUserId: otherUser?.id || null,
        avatar: otherUser?.avatar || "",
      });
    }

    res.json({ conversations: result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get or create DM with a user
router.post("/conversations", protect, async (req, res) => {
  try {
    const otherId = req.body.userId || req.body.otherUserId;
    if (!otherId) return res.status(400).json({ message: "userId required" });
    if (otherId === req.user.id) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    // Find existing 1:1 conversation
    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", req.user.id);

    for (const m of myMemberships || []) {
      const { data: members } = await supabase
        .from("conversation_members")
        .select("user_id")
        .eq("conversation_id", m.conversation_id);

      const ids = (members || []).map((x) => x.user_id);
      if (ids.length === 2 && ids.includes(otherId)) {
        const { data: conv } = await supabase
          .from("conversations")
          .select("*")
          .eq("id", m.conversation_id)
          .single();

        const { data: u } = await supabase
          .from("users")
          .select("id, username, full_name, avatar")
          .eq("id", otherId)
          .maybeSingle();

        return res.json({
          conversation: {
            id: conv.id,
            _id: conv.id,
            otherUser: shapeUser(u),
          },
        });
      }
    }

    // Create new
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ is_group: false, last_message: "" })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: req.user.id },
      { conversation_id: conv.id, user_id: otherId },
    ]);

    const { data: u } = await supabase
      .from("users")
      .select("id, username, full_name, avatar")
      .eq("id", otherId)
      .maybeSingle();

    res.status(201).json({
      conversation: {
        id: conv.id,
        _id: conv.id,
        otherUser: shapeUser(u),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Messages in a conversation + other user
router.get("/:conversationId", protect, async (req, res) => {
  try {
    const cid = req.params.conversationId;

    const { data: member } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", cid)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (!member) return res.status(403).json({ message: "Not a member" });

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", cid)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", cid);

    const otherId = (members || [])
      .map((m) => m.user_id)
      .find((id) => id !== req.user.id);

    let otherUser = null;
    if (otherId) {
      const { data: u } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .eq("id", otherId)
        .maybeSingle();
      otherUser = shapeUser(u);
    }

    res.json({
      messages: (messages || []).map((m) => ({
        id: m.id,
        _id: m.id,
        text: m.text,
        sender_id: m.sender_id,
        senderId: m.sender_id,
        media_url: m.media_url,
        media_type: m.media_type,
        media: m.media_url
          ? { url: m.media_url, type: m.media_type }
          : null,
        createdAt: m.created_at,
      })),
      otherUser,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send message (text or media)
router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    const conversationId = req.body.conversationId;
    if (!conversationId) {
      return res.status(400).json({ message: "conversationId required" });
    }

    let media_url = "";
    let media_type = "";
    if (req.file) {
      media_url = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith("audio")) media_type = "audio";
      else if (req.file.mimetype.startsWith("video")) media_type = "video";
      else media_type = "image";
    }

    const text = (req.body.text || "").trim();
    if (!text && !media_url) {
      return res.status(400).json({ message: "Empty message" });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: req.user.id,
        text: text || (media_type === "audio" ? "Voice message" : media_type === "image" ? "Photo" : "Media"),
        media_url,
        media_type,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    await supabase
      .from("conversations")
      .update({
        last_message: text || (media_type === "audio" ? "Voice message" : "Media"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    res.status(201).json({
      message: {
        id: message.id,
        _id: message.id,
        text: message.text,
        sender_id: message.sender_id,
        senderId: message.sender_id,
        media_url: message.media_url,
        media_type: message.media_type,
        media: message.media_url
          ? { url: message.media_url, type: message.media_type }
          : null,
        createdAt: message.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;