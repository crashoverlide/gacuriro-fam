import express from "express";
import { supabase } from "../config/supabase.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Log a call (missed / answered / cancelled)
router.post("/", protect, async (req, res) => {
  try {
    const { calleeId, mode = "voice", status = "missed" } = req.body;
    if (!calleeId) return res.status(400).json({ message: "calleeId required" });

    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        caller_id: req.user.id,
        callee_id: calleeId,
        mode,
        status,
        seen: status !== "missed",
      })
      .select("*")
      .single();

    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json({ call: data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Missed calls for me
router.get("/missed", protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("call_logs")
      .select("*")
      .eq("callee_id", req.user.id)
      .eq("status", "missed")
      .eq("seen", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ message: error.message });

    const callerIds = [...new Set((data || []).map((c) => c.caller_id))];
    let usersMap = {};
    if (callerIds.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, full_name, avatar")
        .in("id", callerIds);
      (users || []).forEach((u) => {
        usersMap[u.id] = u;
      });
    }

    res.json({
      calls: (data || []).map((c) => ({
        id: c.id,
        mode: c.mode,
        status: c.status,
        createdAt: c.created_at,
        caller: usersMap[c.caller_id]
          ? {
              id: usersMap[c.caller_id].id,
              username: usersMap[c.caller_id].username,
              fullName: usersMap[c.caller_id].full_name,
              avatar: usersMap[c.caller_id].avatar,
            }
          : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/missed/seen", protect, async (req, res) => {
  try {
    await supabase
      .from("call_logs")
      .update({ seen: true })
      .eq("callee_id", req.user.id)
      .eq("status", "missed")
      .eq("seen", false);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;