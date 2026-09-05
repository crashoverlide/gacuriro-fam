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
      cb(
        null,
        `story_${Date.now()}${path.extname(file.originalname) || ".jpg"}`
      ),
  }),
});

router.get("/", protect, async (req, res) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .gte("expires_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ stories: data || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Media required" });
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: req.user.id,
        media_url: `/uploads/${req.file.filename}`,
        media_type: req.file.mimetype.startsWith("video") ? "video" : "image",
        caption: req.body.caption || "",
        expires_at: expires,
      })
      .select("*")
      .single();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ story: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;