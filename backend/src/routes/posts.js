import express from "express";
import { protect } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";
import upload from "../middleware/upload.js";

const router = express.Router();

function mediaPath(file) {
  if (!file) return "";
  return `/uploads/${file.filename}`;
}

function mapPost(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    caption: row.caption || "",
    media_url: row.media_url || "",
    mediaUrl: row.media_url || "",
    media_type: row.media_type || "image",
    is_reel: !!row.is_reel,
    location: row.location || "",
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    created_at: row.created_at,
    createdAt: row.created_at,
    user: row.users
      ? {
          id: row.users.id,
          _id: row.users.id,
          username: row.users.username,
          avatar: row.users.avatar || "",
          fullName: row.users.full_name || "",
        }
      : undefined,
    ...extra,
  };
}

// ---------- CREATE POST / REEL ----------
router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    const userId = req.user.id;
    const caption = req.body.caption || "";
    const location = req.body.location || "";
    const isReel =
      req.body.is_reel === "true" ||
      req.body.isReel === "true" ||
      req.body.type === "reel";

    let media_url = req.body.media_url || "";
    let media_type = req.body.media_type || "image";

    if (req.file) {
      media_url = mediaPath(req.file);
      media_type = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    if (!media_url) {
      return res.status(400).json({ message: "Media required" });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        caption,
        media_url,
        media_type,
        is_reel: isReel || media_type === "video",
        location,
      })
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .single();

    if (error) throw error;

    await supabase
      .from("users")
      .update({ posts_count: (req.user.posts_count || 0) + 1 })
      .eq("id", userId)
      .catch(() => {});

    res.status(201).json({ post: mapPost(data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- FEED (following + recent fallback) ----------
router.get("/feed", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    const followingIds = (follows || []).map((f) => f.following_id);
    const authorIds = [...new Set([userId, ...followingIds])];

    let query = supabase
      .from("posts")
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .order("created_at", { ascending: false })
      .limit(50);

    // If following people, prefer their posts; still show global if few
    if (followingIds.length > 0) {
      query = query.in("user_id", authorIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    let posts = data || [];

    // Fallback: global recent if empty
    if (posts.length === 0) {
      const { data: globalPosts, error: gErr } = await supabase
        .from("posts")
        .select(
          `
          id, caption, media_url, media_type, is_reel, location,
          likes_count, comments_count, created_at, user_id,
          users:user_id ( id, username, avatar, full_name )
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (gErr) throw gErr;
      posts = globalPosts || [];
    }

    const postIds = posts.map((p) => p.id);
    let likedSet = new Set();
    if (postIds.length) {
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
      (likes || []).forEach((l) => likedSet.add(l.post_id));
    }

    res.json({
      posts: posts.map((p) =>
        mapPost(p, { liked: likedSet.has(p.id), isLiked: likedSet.has(p.id) })
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- EXPLORE ----------
router.get("/explore", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) throw error;

    const postIds = (data || []).map((p) => p.id);
    let likedSet = new Set();
    if (postIds.length) {
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
      (likes || []).forEach((l) => likedSet.add(l.post_id));
    }

    res.json({
      posts: (data || []).map((p) =>
        mapPost(p, { liked: likedSet.has(p.id), isLiked: likedSet.has(p.id) })
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- REELS ----------
router.get("/reels", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .or("is_reel.eq.true,media_type.eq.video")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) throw error;

    const postIds = (data || []).map((p) => p.id);
    let likedSet = new Set();
    if (postIds.length) {
      const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
      (likes || []).forEach((l) => likedSet.add(l.post_id));
    }

    res.json({
      posts: (data || []).map((p) =>
        mapPost(p, { liked: likedSet.has(p.id), isLiked: likedSet.has(p.id) })
      ),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- SINGLE POST ----------
router.get("/:id", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { data: like } = await supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", data.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    res.json({
      post: mapPost(data, { liked: !!like, isLiked: !!like }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- LIKE POST ----------
router.post("/:id/like", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from("likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
      await supabase.rpc("decrement_likes_count", { p_id: postId }).catch(async () => {
        const { data: p } = await supabase
          .from("posts")
          .select("likes_count")
          .eq("id", postId)
          .single();
        await supabase
          .from("posts")
          .update({ likes_count: Math.max(0, (p?.likes_count || 1) - 1) })
          .eq("id", postId);
      });
      return res.json({ liked: false });
    }

    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    await supabase.rpc("increment_likes_count", { p_id: postId }).catch(async () => {
      const { data: p } = await supabase
        .from("posts")
        .select("likes_count")
        .eq("id", postId)
        .single();
      await supabase
        .from("posts")
        .update({ likes_count: (p?.likes_count || 0) + 1 })
        .eq("id", postId);
    });

    res.json({ liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- USER POSTS ----------
router.get("/user/:username", protect, async (req, res) => {
  try {
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("id, username")
      .eq("username", req.params.username.toLowerCase())
      .single();

    if (uErr || !u) return res.status(404).json({ message: "User not found" });

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .eq("user_id", u.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ posts: (data || []).map((p) => mapPost(p)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- GET COMMENTS ----------
router.get("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: rows, error } = await supabase
      .from("comments")
      .select(
        `
        id, text, parent_id, created_at, user_id,
        users:user_id ( id, username, avatar )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const ids = (rows || []).map((r) => r.id);
    let likedSet = new Set();
    let likeCounts = {};

    if (ids.length) {
      const { data: likes } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", ids);

      (likes || []).forEach((l) => {
        likeCounts[l.comment_id] = (likeCounts[l.comment_id] || 0) + 1;
        if (l.user_id === userId) likedSet.add(l.comment_id);
      });
    }

    const byId = {};
    const roots = [];

    (rows || []).forEach((r) => {
      const item = {
        id: r.id,
        text: r.text,
        parent_id: r.parent_id,
        created_at: r.created_at,
        user: r.users || { username: "user", avatar: "" },
        liked: likedSet.has(r.id),
        isLiked: likedSet.has(r.id),
        likes_count: likeCounts[r.id] || 0,
        replies: [],
      };
      byId[r.id] = item;
    });

    Object.values(byId).forEach((item) => {
      if (item.parent_id && byId[item.parent_id]) {
        byId[item.parent_id].replies.push(item);
      } else if (!item.parent_id) {
        roots.push(item);
      } else {
        roots.push(item);
      }
    });

    res.json({ comments: roots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- CREATE COMMENT ----------
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const { text, parentId } = req.body;

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Comment text required" });
    }

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userId,
        text: String(text).trim(),
        parent_id: parentId || null,
      })
      .select(
        `
        id, text, parent_id, created_at, user_id,
        users:user_id ( id, username, avatar )
      `
      )
      .single();

    if (error) throw error;

    const { data: p } = await supabase
      .from("posts")
      .select("comments_count")
      .eq("id", postId)
      .single();

    await supabase
      .from("posts")
      .update({ comments_count: (p?.comments_count || 0) + 1 })
      .eq("id", postId);

    res.status(201).json({
      comment: {
        id: data.id,
        text: data.text,
        parent_id: data.parent_id,
        created_at: data.created_at,
        user: data.users || {
          username: req.user.username,
          avatar: req.user.avatar,
        },
        liked: false,
        likes_count: 0,
        replies: [],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- LIKE COMMENT ----------
router.post("/comments/:commentId/like", protect, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);
      return res.json({ liked: false });
    }

    await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: userId,
    });

    res.json({ liked: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// ---------- CREATE POST ----------
router.post("/", protect, upload.single("media"), async (req, res) => {
  try {
    const userId = req.user.id;
    const caption = req.body.caption || "";
    const location = req.body.location || "";
    const isReel =
      req.body.is_reel === "true" ||
      req.body.isReel === "true" ||
      req.body.type === "reel";

    let media_url = req.body.media_url || "";
    let media_type = req.body.media_type || "image";

    if (req.file) {
      media_url = `/uploads/${req.file.filename}`;
      media_type = req.file.mimetype.startsWith("video") ? "video" : "image";
    }

    if (!media_url) {
      return res.status(400).json({ message: "Media required" });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        caption,
        media_url,
        media_type,
        is_reel: isReel || media_type === "video",
        location,
      })
      .select(
        `
        id, caption, media_url, media_type, is_reel, location,
        likes_count, comments_count, created_at, user_id,
        users:user_id ( id, username, avatar, full_name )
      `
      )
      .single();

    if (error) throw error;

    res.status(201).json({ post: mapPost(data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

function mapPost(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    caption: row.caption || "",
    media_url: row.media_url || "",
    mediaUrl: row.media_url || "",
    media_type: row.media_type || "image",
    is_reel: !!row.is_reel,
    location: row.location || "",
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    created_at: row.created_at,
    createdAt: row.created_at,
    user: row.users
      ? {
          id: row.users.id,
          _id: row.users.id,
          username: row.users.username,
          avatar: row.users.avatar || "",
          fullName: row.users.full_name || "",
        }
      : undefined,
    ...extra,
  };
}

export default router;