import express from "express";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

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

// List live sessions
router.get("/", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ message: error.message });

    const hostIds = [...new Set((data || []).map((s) => s.host_id).filter(Boolean))];
    let usersMap = {};
    if (hostIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", hostIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = shapeUser(u);
      });
    }

    res.json({
      sessions: (data || []).map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        startedAt: s.started_at,
        famLinkId: s.fam_link_id,
        host: usersMap[s.host_id] || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create session (you become host + main camera)
router.post("/", protect, async (req, res) => {
  try {
    const title = (req.body.title || "").trim();
    if (!title) return res.status(400).json({ message: "Title required" });

    const { data: session, error } = await supabase
      .from("live_sessions")
      .insert({
        title,
        host_id: req.user.id,
        fam_link_id: req.body.famLinkId || null,
        status: "live",
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    await supabase.from("live_cameras").insert({
      session_id: session.id,
      user_id: req.user.id,
      label: "Host",
      status: "live",
      is_main: true,
    });

    res.status(201).json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        hostId: session.host_id,
        famLinkId: session.fam_link_id,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Session detail + cameras
router.get("/:id", protect, async (req, res) => {
  try {
    const { data: session, error } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error || !session) {
      return res.status(404).json({ message: "Session not found" });
    }

    const { data: cameras } = await supabase
      .from("live_cameras")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    const userIds = [...new Set((cameras || []).map((c) => c.user_id))];
    let usersMap = {};
    if (userIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", userIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = shapeUser(u);
      });
    }

    res.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        hostId: session.host_id,
        famLinkId: session.fam_link_id,
        startedAt: session.started_at,
        endedAt: session.ended_at,
      },
      cameras: (cameras || []).map((c) => ({
        id: c.id,
        userId: c.user_id,
        label: c.label,
        status: c.status,
        isMain: c.is_main,
        user: usersMap[c.user_id] || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request to add my camera
router.post("/:id/cameras", protect, async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!session || session.status !== "live") {
      return res.status(400).json({ message: "Live not active" });
    }

    const label = (req.body.label || "Camera").trim();

    const { data: existing } = await supabase
      .from("live_cameras")
      .select("*")
      .eq("session_id", session.id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (existing) {
      return res.json({
        camera: {
          id: existing.id,
          status: existing.status,
          label: existing.label,
          isMain: existing.is_main,
        },
      });
    }

    const isHost = session.host_id === req.user.id;

    const { data: camera, error } = await supabase
      .from("live_cameras")
      .insert({
        session_id: session.id,
        user_id: req.user.id,
        label,
        status: isHost ? "live" : "pending",
        is_main: false,
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    res.status(201).json({
      camera: {
        id: camera.id,
        status: camera.status,
        label: camera.label,
        isMain: camera.is_main,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Host approves camera
router.put("/:id/cameras/:cameraId/approve", protect, async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!session || session.host_id !== req.user.id) {
      return res.status(403).json({ message: "Only host can approve" });
    }

    const { data, error } = await supabase
      .from("live_cameras")
      .update({ status: "live" })
      .eq("id", req.params.cameraId)
      .eq("session_id", session.id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json({ camera: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set main angle
router.put("/:id/cameras/:cameraId/main", protect, async (req, res) => {
  try {
    const sessionId = req.params.id;
    await supabase
      .from("live_cameras")
      .update({ is_main: false })
      .eq("session_id", sessionId);

    const { data, error } = await supabase
      .from("live_cameras")
      .update({ is_main: true })
      .eq("id", req.params.cameraId)
      .eq("session_id", sessionId)
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.json({ camera: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// End live + optional save note into Fam Link
router.post("/:id/end", protect, async (req, res) => {
  try {
    const { data: session } = await supabase
      .from("live_sessions")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (!session) return res.status(404).json({ message: "Not found" });
    if (session.host_id !== req.user.id) {
      return res.status(403).json({ message: "Only host can end" });
    }

    const { data, error } = await supabase
      .from("live_sessions")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", session.id)
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });

    // If linked Fam Link — add a text moment “Live ended”
    if (session.fam_link_id) {
      await supabase.from("fam_moments").insert({
        link_id: session.fam_link_id,
        user_id: req.user.id,
        media_url: "",
        media_type: "text",
        caption: `Live Perspective ended: ${session.title}`,
        moment_time: new Date().toISOString(),
      });
    }

    res.json({ session: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;