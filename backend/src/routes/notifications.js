import express from "express";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ message: error.message });

    const list = data || [];
    const actorIds = [
      ...new Set(list.map((n) => n.actor_id).filter(Boolean)),
    ];

    let actors = {};
    if (actorIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", actorIds);
      (users || []).forEach((u) => {
        actors[u.id] = u;
      });
    }

    res.json({
      notifications: list.map((n) => ({
        _id: n.id,
        id: n.id,
        type: n.type,
        message: n.message,
        isRead: n.is_read,
        postId: n.post_id,
        createdAt: n.created_at,
        actor: actors[n.actor_id]
          ? {
              _id: actors[n.actor_id].id,
              username: actors[n.actor_id].username,
              fullName: actors[n.actor_id].full_name,
              avatar: actors[n.actor_id].avatar,
            }
          : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/read", protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", req.user.id)
      .eq("is_read", false);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;