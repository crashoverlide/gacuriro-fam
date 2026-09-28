import express from "express";
import { protect } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";

const router = express.Router();

let io = null;
let onlineUsers = null;

export function setPostsRealtime(ioInstance, onlineMap) {
  io = ioInstance;
  onlineUsers = onlineMap;
}

function notifyUser(userId, payload) {
  if (!io || !onlineUsers || !userId) return;
  const sid = onlineUsers.get(String(userId));
  if (sid) io.to(sid).emit("notify", payload);
}

async function getUserPublic(id) {
  if (!id) return null;
  const { data } = await supabase
    .from("users")
    .select("id, username, full_name, avatar")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Attach users{} on each post if join missing */
async function enrichPosts(posts) {
  const list = posts || [];
  const need = list.filter((p) => !p.users && p.user_id);
  if (!need.length) return list;

  const ids = [...new Set(need.map((p) => p.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, username, full_name, avatar")
    .in("id", ids);

  const map = {};
  (users || []).forEach((u) => {
    map[u.id] = u;
  });

  return list.map((p) => ({
    ...p,
    users: p.users || map[p.user_id] || null,
    user: p.user || p.users || map[p.user_id] || null,
  }));
}

// ——— FEED (all recent posts + author) ———
router.get("/feed", protect, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, caption, media_url, media_type, is_reel, location, likes_count, comments_count, created_at, users:user_id(id, username, full_name, avatar)"
      )
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      const fb = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (fb.error) throw fb.error;
      data = await enrichPosts(fb.data);
    } else {
      data = await enrichPosts(data);
    }

    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/explore", protect, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, caption, media_url, media_type, is_reel, location, likes_count, comments_count, created_at, users:user_id(id, username, full_name, avatar)"
      )
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      const fb = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (fb.error) throw fb.error;
      data = await enrichPosts(fb.data);
    } else {
      data = await enrichPosts(data);
    }

    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reels", protect, async (req, res) => {
  try {
    let { data, error } = await supabase
      .from("posts")
      .select(
        "id, user_id, caption, media_url, media_type, is_reel, location, likes_count, comments_count, created_at, users:user_id(id, username, full_name, avatar)"
      )
      .or("is_reel.eq.true,media_type.eq.video")
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      const fb = await supabase
        .from("posts")
        .select("*")
        .or("is_reel.eq.true,media_type.eq.video")
        .order("created_at", { ascending: false })
        .limit(40);
      if (fb.error) throw fb.error;
      data = await enrichPosts(fb.data);
    } else {
      data = await enrichPosts(data);
    }

    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create post
router.post("/", protect, async (req, res) => {
  try {
    const {
      caption,
      media_url,
      mediaUrl,
      media_type,
      mediaType,
      is_reel,
      isReel,
      location,
    } = req.body;

    const url = media_url || mediaUrl || "";
    const type =
      media_type ||
      mediaType ||
      (/\.(mp4|webm|mov)/i.test(url) ? "video" : "image");
    const reel = Boolean(is_reel ?? isReel ?? type === "video");

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: req.user.id,
        caption: caption || "",
        media_url: url,
        media_type: type,
        is_reel: reel,
        location: location || "",
        likes_count: 0,
        comments_count: 0,
      })
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });

    await supabase
      .from("users")
      .update({
        posts_count: (req.user.posts_count || 0) + 1,
      })
      .eq("id", req.user.id);

    const enriched = await enrichPosts([data]);
    res.status(201).json({ post: enriched[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "*, users:user_id(id, username, full_name, avatar)"
      )
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Post not found" });

    const [post] = await enrichPosts([data]);
    res.json({ post });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Like post
router.post("/:id/like", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id, likes_count")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { data: existing } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
      await supabase
        .from("posts")
        .update({ likes_count: Math.max(0, (post.likes_count || 1) - 1) })
        .eq("id", postId);
      return res.json({ liked: false });
    }

    await supabase.from("likes").insert({ post_id: postId, user_id: userId });
    await supabase
      .from("posts")
      .update({ likes_count: (post.likes_count || 0) + 1 })
      .eq("id", postId);

    if (String(post.user_id) !== String(userId)) {
      const me = await getUserPublic(userId);
      notifyUser(post.user_id, {
        type: "like",
        fromName: me?.username || "Someone",
        text: "liked your post",
        postId,
      });
    }

    res.json({ liked: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ——— COMMENTS (Instagram-style) ———
router.get("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const { data, error } = await supabase
      .from("comments")
      .select(
        "id, post_id, user_id, parent_id, text, likes_count, created_at, users:user_id(id, username, full_name, avatar)"
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      // fallback without join
      const fb = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (fb.error) throw fb.error;

      const ids = [...new Set((fb.data || []).map((c) => c.user_id))];
      let map = {};
      if (ids.length) {
        const { data: us } = await supabase
          .from("users")
          .select("id, username, full_name, avatar")
          .in("id", ids);
        (us || []).forEach((u) => {
          map[u.id] = u;
        });
      }
      const comments = (fb.data || []).map((c) => ({
        ...c,
        users: map[c.user_id] || null,
        user: map[c.user_id] || null,
        liked_by_me: false,
      }));
      return res.json({ comments });
    }

    const comments = (data || []).map((c) => ({
      ...c,
      user: c.users || null,
      liked_by_me: false,
    }));
    res.json({ comments });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const text = String(req.body.text || "").trim();
    const parentId = req.body.parentId || req.body.parent_id || null;
    if (!text) return res.status(400).json({ message: "Text required" });

    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id, comments_count")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const { data: created, error } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: req.user.id,
        parent_id: parentId,
        text,
        likes_count: 0,
      })
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });

    await supabase
      .from("posts")
      .update({ comments_count: (post.comments_count || 0) + 1 })
      .eq("id", postId);

    const me = await getUserPublic(req.user.id);
    if (String(post.user_id) !== String(req.user.id)) {
      notifyUser(post.user_id, {
        type: "comment",
        fromName: me?.username || "Someone",
        text: parentId
          ? "replied on your post"
          : `commented: ${text.slice(0, 80)}`,
        postId,
      });
    }

    if (parentId) {
      const { data: parent } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", parentId)
        .maybeSingle();
      if (parent && String(parent.user_id) !== String(req.user.id)) {
        notifyUser(parent.user_id, {
          type: "reply",
          fromName: me?.username || "Someone",
          text: "replied to your comment",
          postId,
        });
      }
    }

    res.status(201).json({
      comment: {
        ...created,
        users: me,
        user: me,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/comments/:commentId/like", protect, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const { data: comment } = await supabase
      .from("comments")
      .select("id, user_id, likes_count, post_id")
      .eq("id", commentId)
      .maybeSingle();
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const { data: existing } = await supabase
      .from("comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId);
      await supabase
        .from("comments")
        .update({
          likes_count: Math.max(0, (comment.likes_count || 1) - 1),
        })
        .eq("id", commentId);
      return res.json({ liked: false });
    }

    await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: userId });
    await supabase
      .from("comments")
      .update({ likes_count: (comment.likes_count || 0) + 1 })
      .eq("id", commentId);

    if (String(comment.user_id) !== String(userId)) {
      const me = await getUserPublic(userId);
      notifyUser(comment.user_id, {
        type: "comment_like",
        fromName: me?.username || "Someone",
        text: "liked your comment",
        postId: comment.post_id,
      });
    }

    res.json({ liked: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;