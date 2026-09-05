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
      cb(null, `fam_${Date.now()}${path.extname(file.originalname) || ".jpg"}`),
  }),
  limits: { fileSize: 80 * 1024 * 1024 },
});

// Create Fam Link (e.g. "Kigali Concert 2026")
router.post("/", protect, async (req, res) => {
  try {
    const { title, description, location, eventDate, memberIds = [] } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title required" });

    const { data: link, error } = await supabase
      .from("fam_links")
      .insert({
        title: title.trim(),
        description: description || "",
        location: location || "",
        event_date: eventDate || null,
        created_by: req.user.id,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    const members = [
      { link_id: link.id, user_id: req.user.id, role: "owner" },
      ...memberIds
        .filter((id) => id !== req.user.id)
        .map((id) => ({ link_id: link.id, user_id: id, role: "member" })),
    ];
    await supabase.from("fam_link_members").upsert(members);

    res.status(201).json({ link });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// My Fam Links
router.get("/", protect, async (req, res) => {
  try {
    const { data: memberships } = await supabase
      .from("fam_link_members")
      .select("link_id")
      .eq("user_id", req.user.id);

    const ids = (memberships || []).map((m) => m.link_id);
    if (!ids.length) return res.json({ links: [] });

    const { data: links, error } = await supabase
      .from("fam_links")
      .select("*")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ links: links || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Timeline of moments (ordered by moment_time)
router.get("/:id/moments", protect, async (req, res) => {
  try {
    const { data: moments, error } = await supabase
      .from("fam_moments")
      .select("*")
      .eq("link_id", req.params.id)
      .order("moment_time", { ascending: true });

    if (error) return res.status(500).json({ message: error.message });

    const userIds = [...new Set((moments || []).map((m) => m.user_id))];
    let usersMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", userIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = u;
      });
    }

    res.json({
      moments: (moments || []).map((m) => ({
        id: m.id,
        mediaUrl: m.media_url,
        mediaType: m.media_type,
        caption: m.caption,
        momentTime: m.moment_time,
        createdAt: m.created_at,
        user: usersMap[m.user_id]
          ? {
              id: usersMap[m.user_id].id,
              username: usersMap[m.user_id].username,
              fullName: usersMap[m.user_id].full_name,
              avatar: usersMap[m.user_id].avatar,
            }
          : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a moment (photo / video / voice / text) to the shared timeline
router.post("/:id/moments", protect, upload.single("media"), async (req, res) => {
  try {
    let mediaType = "text";
    let mediaUrl = "";
    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith("video")) mediaType = "video";
      else if (req.file.mimetype.startsWith("audio")) mediaType = "audio";
      else mediaType = "image";
    }

    const { data: moment, error } = await supabase
      .from("fam_moments")
      .insert({
        link_id: req.params.id,
        user_id: req.user.id,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: req.body.caption || "",
        moment_time: req.body.momentTime || new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ moment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;