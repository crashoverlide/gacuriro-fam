import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import { ArrowBack, Lock, LockOpen, Delete } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function FutureDropDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [drop, setDrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTime, setNewTime] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/future-drops/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDrop(data.drop);
      else setDrop(null);
    } catch {
      setDrop(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) load();
  }, [token, id]);

  const changeTime = async () => {
    if (!newTime) return;
    const res = await fetch(`${API_URL}/api/future-drops/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ unlockAt: new Date(newTime).toISOString() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Unlock time updated");
      setDrop(data.drop);
    } else setMsg(data.message || "Failed");
  };

  const remove = async () => {
    if (!window.confirm("Delete this Future Drop?")) return;
    await fetch(`${API_URL}/api/future-drops/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate("/future-drops");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (!drop) {
    return (
      <Box px={2} py={4}>
        <Typography>Drop not found</Typography>
      </Box>
    );
  }

  const unlocked = drop.unlocked && !drop.locked;

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", pb: 10 }}>
      <Box display="flex" alignItems="center" gap={1} px={2} py={1.5}>
        <IconButton onClick={() => navigate("/future-drops")}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800} flex={1}>
          Future Drop
        </Typography>
        {drop.isCreator && (
          <IconButton color="error" onClick={remove}>
            <Delete />
          </IconButton>
        )}
      </Box>

      <Box px={2}>
        {msg && (
          <Alert sx={{ mb: 2 }} onClose={() => setMsg("")}>
            {msg}
          </Alert>
        )}

        <Box display="flex" alignItems="center" gap={1} mb={2}>
          {unlocked ? <LockOpen color="success" /> : <Lock color="secondary" />}
          <Typography fontWeight={700}>
            {unlocked ? "Unlocked" : "Locked"}
          </Typography>
        </Box>

        <Typography color="text.secondary" fontSize={14} mb={2}>
          Unlock time: {new Date(drop.unlockAt).toLocaleString()}
        </Typography>

        {!unlocked && !drop.isCreator && (
          <Typography
            sx={{
              p: 3,
              textAlign: "center",
              bgcolor: "#111",
              color: "#fff",
              borderRadius: 3,
            }}
          >
            🔒 This drop opens on{" "}
            <b>{new Date(drop.unlockAt).toLocaleString()}</b>
          </Typography>
        )}

        {(unlocked || drop.isCreator) && (
          <>
            {drop.caption && (
              <Typography fontSize={16} mb={2}>
                {drop.caption}
              </Typography>
            )}
            {drop.mediaUrl && drop.mediaType === "image" && (
              <Box
                component="img"
                src={mediaSrc(drop.mediaUrl)}
                sx={{ width: "100%", borderRadius: 2, mb: 2 }}
              />
            )}
            {drop.mediaUrl && drop.mediaType === "video" && (
              <video
                src={mediaSrc(drop.mediaUrl)}
                controls
                playsInline
                style={{ width: "100%", borderRadius: 8, marginBottom: 16 }}
              />
            )}
            {drop.mediaUrl && drop.mediaType === "audio" && (
              <audio
                controls
                src={mediaSrc(drop.mediaUrl)}
                style={{ width: "100%", marginBottom: 16 }}
              />
            )}
          </>
        )}

        {drop.isCreator && !drop.unlocked && (
          <Box mt={3}>
            <Typography fontWeight={700} mb={1}>
              Change unlock time
            </Typography>
            <TextField
              type="datetime-local"
              fullWidth
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 1 }}
            />
            <Button variant="outlined" onClick={changeTime}>
              Update time
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default FutureDropDetail;