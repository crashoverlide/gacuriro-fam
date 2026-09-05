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
      cb(null, `drop_${Date.now()}${path.extname(file.originalname) || ".bin"}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

function shapeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    _id: u.id,
    username: u.username,
    fullName: u.full_name || "",
    avatar: u.avatar || "",
  };
}

async function unlockDue() {
  const now = new Date().toISOString();
  await supabase
    .from("future_drops")
    .update({ unlocked: true, unlocked_at: now })
    .eq("unlocked", false)
    .lte("unlock_at", now);
}

function shapeDrop(d, { creator, recipient }, viewerId) {
  const isCreator = viewerId === d.creator_id;
  const isRecipient = viewerId === d.recipient_id;
  const unlocked = Boolean(d.unlocked);

  const base = {
    id: d.id,
    _id: d.id,
    unlockAt: d.unlock_at,
    unlocked,
    unlockedAt: d.unlocked_at,
    createdAt: d.created_at,
    isSelf: d.creator_id === d.recipient_id,
    isCreator,
    isRecipient,
    creator: creator || null,
    recipient: recipient || null,
  };

  // Locked: hide media/caption from recipient (creator can still see)
  if (!unlocked && !isCreator) {
    return {
      ...base,
      locked: true,
      mediaUrl: "",
      mediaType: d.media_type,
      caption: "",
      preview: "🔒 Locked until " + new Date(d.unlock_at).toLocaleString(),
    };
  }

  return {
    ...base,
    locked: !unlocked,
    mediaUrl: d.media_url || "",
    mediaType: d.media_type || "text",
    caption: d.caption || "",
    preview: unlocked
      ? d.caption || (d.media_type === "text" ? "Message" : "Media")
      : "Waiting to unlock…",
  };
}

// Auto-unlock due drops on every request
router.use(protect, async (_req, _res, next) => {
  try {
    await unlockDue();
  } catch (_) {}
  next();
});

// Create Future Drop
router.post("/", upload.single("media"), async (req, res) => {
  try {
    const recipientId = req.body.recipientId || req.body.toSelf === "true"
      ? req.user.id
      : req.body.recipientId;
    const toSelf =
      req.body.toSelf === "true" ||
      req.body.toSelf === true ||
      recipientId === req.user.id;

    const finalRecipient = toSelf ? req.user.id : recipientId;
    if (!finalRecipient) {
      return res.status(400).json({ message: "recipientId or toSelf required" });
    }

    const unlockAt = req.body.unlockAt;
    if (!unlockAt) {
      return res.status(400).json({ message: "unlockAt required (ISO date)" });
    }
    if (new Date(unlockAt) <= new Date()) {
      return res.status(400).json({ message: "unlockAt must be in the future" });
    }

    let media_url = "";
    let media_type = "text";
    if (req.file) {
      media_url = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith("video")) media_type = "video";
      else if (req.file.mimetype.startsWith("audio")) media_type = "audio";
      else media_type = "image";
    }

    const caption = (req.body.caption || req.body.text || "").trim();
    if (!caption && !media_url) {
      return res.status(400).json({ message: "Add text or media" });
    }

    const { data, error } = await supabase
      .from("future_drops")
      .insert({
        creator_id: req.user.id,
        recipient_id: finalRecipient,
        media_url,
        media_type,
        caption,
        unlock_at: new Date(unlockAt).toISOString(),
        unlocked: false,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    res.status(201).json({
      drop: shapeDrop(data, {}, req.user.id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inbox: drops sent TO me
router.get("/inbox", async (req, res) => {
  try {
    await unlockDue();
    const { data, error } = await supabase
      .from("future_drops")
      .select("*")
      .eq("recipient_id", req.user.id)
      .order("unlock_at", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    const creatorIds = [...new Set((data || []).map((d) => d.creator_id))];
    let usersMap = {};
    if (creatorIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", creatorIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = shapeUser(u);
      });
    }

    res.json({
      drops: (data || []).map((d) =>
        shapeDrop(
          d,
          { creator: usersMap[d.creator_id], recipient: null },
          req.user.id
        )
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sent: drops I created
router.get("/sent", async (req, res) => {
  try {
    await unlockDue();
    const { data, error } = await supabase
      .from("future_drops")
      .select("*")
      .eq("creator_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });

    const recipientIds = [...new Set((data || []).map((d) => d.recipient_id))];
    let usersMap = {};
    if (recipientIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", recipientIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = shapeUser(u);
      });
    }

    res.json({
      drops: (data || []).map((d) =>
        shapeDrop(
          d,
          { creator: null, recipient: usersMap[d.recipient_id] },
          req.user.id
        )
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single drop
router.get("/:id", async (req, res) => {
  try {
    await unlockDue();
    const { data, error } = await supabase
      .from("future_drops")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ message: "Drop not found" });
    }

    if (
      data.creator_id !== req.user.id &&
      data.recipient_id !== req.user.id
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const ids = [data.creator_id, data.recipient_id];
    const { data: users } = await supabase
      .from("users")
      .select("id, username, full_name, avatar")
      .in("id", ids);
    const map = {};
    (users || []).forEach((u) => {
      map[u.id] = shapeUser(u);
    });

    res.json({
      drop: shapeDrop(
        data,
        {
          creator: map[data.creator_id],
          recipient: map[data.recipient_id],
        },
        req.user.id
      ),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Change unlock time (creator only, while locked)
router.put("/:id", async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from("future_drops")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.creator_id !== req.user.id) {
      return res.status(403).json({ message: "Only creator can edit" });
    }
    if (existing.unlocked) {
      return res.status(400).json({ message: "Already unlocked" });
    }

    const unlockAt = req.body.unlockAt;
    if (!unlockAt || new Date(unlockAt) <= new Date()) {
      return res.status(400).json({ message: "unlockAt must be in the future" });
    }

    const { data, error } = await supabase
      .from("future_drops")
      .update({ unlock_at: new Date(unlockAt).toISOString() })
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json({ drop: shapeDrop(data, {}, req.user.id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete (creator only)
router.delete("/:id", async (req, res) => {
  try {
    const { data: existing } = await supabase
      .from("future_drops")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.creator_id !== req.user.id) {
      return res.status(403).json({ message: "Only creator can delete" });
    }

    await supabase.from("future_drops").delete().eq("id", req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;