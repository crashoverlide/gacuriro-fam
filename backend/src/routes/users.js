import express from "express";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

function shapeUser(u) {
  if (!u) return null;
  return {
    _id: u.id,
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.full_name || "",
    bio: u.bio || "",
    avatar: u.avatar || "",
    location: u.location || "",
    birthday: u.birthday || "",
    postsCount: u.posts_count || 0,
    isPrivate: u.is_private || false,
    twoFactorEnabled: u.two_factor_enabled || false,
  };
}

// ——— fixed paths first ———

router.put("/me", protect, async (req, res) => {
  try {
    const { username, fullName, birthday, location, bio, website, avatar } =
      req.body;
    const patch = { updated_at: new Date().toISOString() };
    if (fullName !== undefined) patch.full_name = fullName;
    if (birthday !== undefined) patch.birthday = birthday;
    if (location !== undefined) patch.location = location;
    if (bio !== undefined) patch.bio = bio;
    if (website !== undefined) patch.website = website;
    if (avatar !== undefined) patch.avatar = avatar;
    if (username) patch.username = String(username).trim().toLowerCase();

    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });
    res.json({ user: shapeUser(data) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/private", protect, async (req, res) => {
  try {
    const isPrivate = Boolean(req.body.isPrivate ?? req.body.private);
    const { data, error } = await supabase
      .from("users")
      .update({
        is_private: isPrivate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });
    res.json({ isPrivate: data.is_private, user: shapeUser(data) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/2fa", protect, async (req, res) => {
  try {
    const enabled = Boolean(
      req.body.enabled ?? req.body.twoFactorEnabled ?? req.body.twoFactor
    );
    const { data, error } = await supabase
      .from("users")
      .update({
        two_factor_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.user.id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });
    res.json({
      twoFactorEnabled: data.two_factor_enabled,
      user: shapeUser(data),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/suggested", protect, async (req, res) => {
  try {
    const { data: following } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", req.user.id);

    const exclude = new Set([
      req.user.id,
      ...(following || []).map((f) => f.following_id),
    ]);

    const { data: users, error } = await supabase
      .from("users")
      .select(
        "id, username, email, full_name, avatar, bio, posts_count, is_private, two_factor_enabled"
      )
      .limit(30);

    if (error) return res.status(500).json({ message: error.message });

    res.json({
      users: (users || [])
        .filter((u) => !exclude.has(u.id))
        .slice(0, 15)
        .map(shapeUser),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", protect, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json({ users: [] });

    const { data, error } = await supabase
      .from("users")
      .select(
        "id, username, email, full_name, avatar, bio, posts_count, is_private, two_factor_enabled"
      )
      .or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(30);

    if (error) return res.status(500).json({ message: error.message });
    res.json({ users: (data || []).map(shapeUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/follow", protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }
    const { error } = await supabase.from("follows").upsert({
      follower_id: req.user.id,
      following_id: targetId,
    });
    if (error) return res.status(400).json({ message: error.message });
    res.json({ message: "Followed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/:id/unfollow", protect, async (req, res) => {
  try {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", req.user.id)
      .eq("following_id", req.params.id);
    if (error) return res.status(400).json({ message: error.message });
    res.json({ message: "Unfollowed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ——— followers / following (before bare /:username) ———

router.get("/:username/followers", protect, async (req, res) => {
  try {
    const uname = req.params.username.toLowerCase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", uname)
      .maybeSingle();

    if (!user) return res.status(404).json({ message: "User not found" });

    const { data: rows, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", user.id);

    if (error) return res.status(500).json({ message: error.message });

    const ids = (rows || []).map((r) => r.follower_id);
    if (!ids.length) return res.json({ users: [] });

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select(
        "id, username, email, full_name, avatar, bio, posts_count, is_private, two_factor_enabled"
      )
      .in("id", ids);

    if (uErr) return res.status(500).json({ message: uErr.message });
    res.json({ users: (users || []).map(shapeUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:username/following", protect, async (req, res) => {
  try {
    const uname = req.params.username.toLowerCase();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", uname)
      .maybeSingle();

    if (!user) return res.status(404).json({ message: "User not found" });

    const { data: rows, error } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (error) return res.status(500).json({ message: error.message });

    const ids = (rows || []).map((r) => r.following_id);
    if (!ids.length) return res.json({ users: [] });

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select(
        "id, username, email, full_name, avatar, bio, posts_count, is_private, two_factor_enabled"
      )
      .in("id", ids);

    if (uErr) return res.status(500).json({ message: uErr.message });
    res.json({ users: (users || []).map(shapeUser) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:username/posts", protect, async (req, res) => {
  try {
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("username", req.params.username.toLowerCase())
      .maybeSingle();

    if (!user) return res.status(404).json({ message: "User not found" });

    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: error.message });
    res.json({ posts: posts || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:username", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", req.params.username.toLowerCase())
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ message: "User not found" });
    }

    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", data.id);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", data.id);

    res.json({
      user: {
        ...shapeUser(data),
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;