import express from "express";
import { protect } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";

const router = express.Router();

// onlineUsers + io injected from index.js
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
  const { data } = await supabase
    .from("users")
    .select("id, username, full_name, avatar")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ——— Feed / explore / reels (keep simple + fast) ———
router.get("/feed", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*, users:user_id(id, username, full_name, avatar)")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/explore", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*, users:user_id(id, username, full_name, avatar)")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/reels", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*, users:user_id(id, username, full_name, avatar)")
      .or("is_reel.eq.true,media_type.eq.video")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) throw error;
    res.json({ posts: data || [] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*, users:user_id(id, username, full_name, avatar)")
      .eq("id", req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Post not found" });
    res.json({ post: data });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Like post → notify owner
router.post("/:id/like", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data: existing } = await supabase
      .from("likes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id, likes_count")
      .eq("id", postId)
      .maybeSingle();

    if (!post) return res.status(404).json({ message: "Post not found" });

    if (existing) {
      await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
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
        text: `liked your post`,
        postId,
      });
    }

    res.json({ liked: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Get comments (top-level + replies)
router.get("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("comments")
      .select("*, users:user_id(id, username, full_name, avatar)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = data || [];
    // likes for current user
    const ids = rows.map((r) => r.id);
    let likedSet = new Set();
    if (ids.length) {
      const { data: cl } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq("user_id", userId)
        .in("comment_id", ids);
      (cl || []).forEach((x) => likedSet.add(x.comment_id));
    }

    const mapped = rows.map((r) => ({
      id: r.id,
      text: r.text,
      created_at: r.created_at,
      parent_id: r.parent_id,
      likes_count: r.likes_count || 0,
      liked_by_me: likedSet.has(r.id),
      user: r.users
        ? {
            id: r.users.id,
            username: r.users.username,
            fullName: r.users.full_name,
            avatar: r.users.avatar,
          }
        : null,
    }));

    const tops = mapped.filter((c) => !c.parent_id);
    const replies = mapped.filter((c) => c.parent_id);
    const tree = tops.map((t) => ({
      ...t,
      replies: replies.filter((r) => String(r.parent_id) === String(t.id)),
    }));

    res.json({ comments: tree });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Create comment / reply → notify
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const text = (req.body?.text || "").trim();
    const parentId = req.body?.parentId || null;

    if (!text) return res.status(400).json({ message: "Text required" });

    const { data: post } = await supabase
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return res.status(404).json({ message: "Post not found" });

    const insert = {
      post_id: postId,
      user_id: userId,
      text,
      likes_count: 0,
    };
    if (parentId) insert.parent_id = parentId;

    const { data: created, error } = await supabase
      .from("comments")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw error;

    await supabase.rpc("increment_comments", { post_id_input: postId }).catch(() =>
      supabase
        .from("posts")
        .update({ comments_count: (post.comments_count || 0) + 1 })
        .eq("id", postId)
    );

    const me = await getUserPublic(userId);

    // notify post owner
    if (String(post.user_id) !== String(userId)) {
      notifyUser(post.user_id, {
        type: "comment",
        fromName: me?.username || "Someone",
        text: parentId ? "replied on your post" : `commented: ${text.slice(0, 80)}`,
        postId,
      });
    }

    // notify parent comment author
    if (parentId) {
      const { data: parent } = await supabase
        .from("comments")
        .select("user_id")
        .eq("id", parentId)
        .maybeSingle();
      if (parent && String(parent.user_id) !== String(userId)) {
        notifyUser(parent.user_id, {
          type: "reply",
          fromName: me?.username || "Someone",
          text: `replied to your comment`,
          postId,
        });
      }
    }

    res.status(201).json({ comment: created });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Like comment → notify author
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
        .update({ likes_count: Math.max(0, (comment.likes_count || 1) - 1) })
        .eq("id", commentId);
      return res.json({ liked: false });
    }

    await supabase.from("comment_likes").insert({
      comment_id: commentId,
      user_id: userId,
    });
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