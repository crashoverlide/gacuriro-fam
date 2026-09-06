import express from "express";
import multer from "multer";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Memory storage for Supabase upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

async function attachUser(post, currentUserId = null) {
  const { data: user } = await supabase
    .from("users")
    .select("id, username, full_name, avatar")
    .eq("id", post.user_id)
    .single();

  let liked = false;
  if (currentUserId) {
    const { data: like } = await supabase
      .from("likes")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("post_id", post.id)
      .maybeSingle();
    liked = !!like;
  }

  return {
    _id: post.id,
    id: post.id,
    caption: post.caption,
    mediaUrl: post.media_url,
    media_url: post.media_url,
    mediaType: post.media_type,
    isReel: post.is_reel,
    location: post.location,
    likesCount: post.likes_count || 0,
    commentsCount: post.comments_count || 0,
    createdAt: post.created_at,
    liked,
    user: user
      ? {
          _id: user.id,
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          avatar: user.avatar,
        }
      : null,
  };
}

// ====================== FEED ======================
router.get("/feed", protect, async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return res.status(500).json({ message: error.message });

    const shaped = await Promise.all(
      (posts || []).map((p) => attachUser(p, req.user.id))
    );
    res.json({ posts: shaped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== EXPLORE ======================
router.get("/explore", protect, async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return res.status(500).json({ message: error.message });

    const shaped = await Promise.all(
      (posts || []).map((p) => attachUser(p, req.user.id))
    );
    res.json({ posts: shaped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== REELS ======================
router.get("/reels", protect, async (req, res) => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("is_reel", true)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) return res.status(500).json({ message: error.message });

    const shaped = await Promise.all(
      (posts || []).map((p) => attachUser(p, req.user.id))
    );
    res.json({ posts: shaped });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== CREATE POST ======================
router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    let mediaUrl = "";
    let mediaType = "image";

    if (req.file) {
      const ext = req.file.originalname.split(".").pop() || "jpg";
      const fileName = `${req.user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return res.status(500).json({ message: uploadError.message });
      }

      const { data: publicData } = supabase.storage
        .from("media")
        .getPublicUrl(fileName);

      mediaUrl = publicData.publicUrl;
      mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    const isReel =
      req.body.isReel === "true" ||
      req.body.isReel === true ||
      mediaType === "video";

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: req.user.id,
        caption: req.body.caption || "",
        media_url: mediaUrl,
        media_type: mediaType,
        is_reel: isReel,
        location: req.body.location || "",
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    await supabase
      .from("users")
      .update({ posts_count: (req.user.postsCount || 0) + 1 })
      .eq("id", req.user.id);

    res.status(201).json({ post: await attachUser(post, req.user.id) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ====================== SINGLE POST ======================
router.get("/:id", protect, async (req, res) => {
  try {
    if (!req.params.id || req.params.id === "undefined") {
      return res.status(400).json({ message: "Invalid post id" });
    }

    const { data: post, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { data: commentRows } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    const comments = [];
    for (const c of commentRows || []) {
      const { data: u } = await supabase
        .from("users")
        .select("id, username, avatar")
        .eq("id", c.user_id)
        .maybeSingle();

      comments.push({
        id: c.id,
        _id: c.id,
        text: c.text,
        createdAt: c.created_at,
        user: u
          ? { id: u.id, username: u.username, avatar: u.avatar }
          : null,
      });
    }

    res.json({
      post: await attachUser(post, req.user.id),
      comments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== LIKE / UNLIKE ======================
router.post("/:id/like", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from("likes")
      .select("*")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();

    if (existing) {
      // Unlike
      await supabase
        .from("likes")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      const { data: p } = await supabase
        .from("posts")
        .select("likes_count")
        .eq("id", postId)
        .single();

      await supabase
        .from("posts")
        .update({ likes_count: Math.max(0, (p?.likes_count || 1) - 1) })
        .eq("id", postId);

      return res.json({ liked: false });
    }

    // Like
    await supabase.from("likes").insert({
      user_id: userId,
      post_id: postId,
    });

    const { data: p } = await supabase
      .from("posts")
      .select("likes_count, user_id")
      .eq("id", postId)
      .single();

    await supabase
      .from("posts")
      .update({ likes_count: (p?.likes_count || 0) + 1 })
      .eq("id", postId);

    // Notification to post owner
    if (p?.user_id && p.user_id !== userId) {
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        from_user_id: userId,
        type: "like",
        post_id: postId,
        message: "liked your post",
      });
    }

    res.json({ liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ====================== COMMENTS ======================
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ message: "Text required" });

    const { data: comment, error } = await supabase
      .from("comments")
      .insert({
        post_id: req.params.id,
        user_id: req.user.id,
        text,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    const { data: p } = await supabase
      .from("posts")
      .select("comments_count, user_id")
      .eq("id", req.params.id)
      .single();

    await supabase
      .from("posts")
      .update({ comments_count: (p?.comments_count || 0) + 1 })
      .eq("id", req.params.id);

    // Notification to post owner
    if (p?.user_id && p.user_id !== req.user.id) {
      await supabase.from("notifications").insert({
        user_id: p.user_id,
        from_user_id: req.user.id,
        type: "comment",
        post_id: req.params.id,
        message: "commented on your post",
      });
    }

    res.status(201).json({
      comment: {
        id: comment.id,
        _id: comment.id,
        text: comment.text,
        createdAt: comment.created_at,
        user: {
          id: req.user.id,
          username: req.user.username,
          avatar: req.user.avatar,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;