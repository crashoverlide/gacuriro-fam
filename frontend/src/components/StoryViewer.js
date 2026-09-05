import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  TextField,
  LinearProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
} from "@mui/material";
import {
  Close,
  MoreHoriz,
  VolumeOff,
  VolumeUp,
  Favorite,
  FavoriteBorder,
  Send,
  Pause,
  PlayArrow,
  Bookmark,
  BookmarkBorder,
} from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";

function StoryViewer({ stories = [], open, onClose, onDeleted }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reply, setReply] = useState("");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const timerRef = useRef(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  const current = stories[index];
  const isOwn =
    current?.user?._id === user?._id ||
    current?.user?.username === user?.username;

  useEffect(() => {
    if (open) {
      setIndex(0);
      setLiked(false);
      setSaved(false);
      setReply("");
    }
  }, [open, stories]);

  useEffect(() => {
    if (!open || !current || paused) {
      clearInterval(timerRef.current);
      return;
    }

    if (current._id) {
      fetch(`${API_URL}/api/stories/${current._id}/view`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    const duration = 5000;
    startRef.current = Date.now() - elapsedRef.current;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      elapsedRef.current = elapsed;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);
      if (p >= 100) {
        elapsedRef.current = 0;
        clearInterval(timerRef.current);
        if (index < stories.length - 1) {
          setIndex((i) => i + 1);
          setLiked(false);
        } else {
          onClose();
        }
      }
    }, 50);

    return () => clearInterval(timerRef.current);
  }, [index, open, current, paused, stories.length, token, onClose]);

  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
  }, [index]);

  if (!open || !current) return null;

  const mediaUrlPath = current.media?.url || current.media;
  const fullUrl = mediaUrlPath?.startsWith("http")
    ? mediaUrlPath
    : `${API_URL}${mediaUrlPath}`;
  const isVideo = current.media?.type === "video";

  const goNext = () => {
    elapsedRef.current = 0;
    if (index < stories.length - 1) {
      setIndex(index + 1);
      setLiked(false);
    } else onClose();
  };

  const goPrev = () => {
    elapsedRef.current = 0;
    if (index > 0) {
      setIndex(index - 1);
      setLiked(false);
    }
  };

  const handleDelete = async () => {
    setMenuAnchor(null);
    try {
      await fetch(`${API_URL}/api/stories/${current._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted?.(current._id);
      if (stories.length <= 1) onClose();
      else goNext();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArchive = async () => {
    setMenuAnchor(null);
    try {
      await fetch(`${API_URL}/api/stories/${current._id}/archive`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted?.(current._id);
      if (stories.length <= 1) onClose();
      else goNext();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || isOwn) return;
    try {
      // open/create DM and send story reply text
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: current.user?._id }),
      });
      const data = await res.json();
      if (res.ok && data.conversation?._id) {
        await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: data.conversation._id,
            text: `Replied to story: ${reply.trim()}`,
          }),
        });
        setReply("");
        alert("Reply sent");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = () => {
    setSaved((s) => !s);
    const key = "savedStories";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    if (!saved) {
      list.push({
        id: current._id,
        url: fullUrl,
        user: current.user?.username,
        at: Date.now(),
      });
      localStorage.setItem(key, JSON.stringify(list));
    } else {
      localStorage.setItem(
        key,
        JSON.stringify(list.filter((x) => x.id !== current._id))
      );
    }
    setMenuAnchor(null);
  };

  const handleReport = () => {
    setMenuAnchor(null);
    alert("Thanks — story reported.");
  };

  const handleMute = () => {
    setMenuAnchor(null);
    const key = "mutedStoryUsers";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    const id = current.user?._id;
    if (id && !list.includes(id)) {
      list.push(id);
      localStorage.setItem(key, JSON.stringify(list));
    }
    alert(`Muted ${current.user?.username}'s stories`);
    onClose();
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "#000",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Progress bars */}
      <Box display="flex" gap={0.5} px={1} pt={1.5}>
        {stories.map((_, i) => (
          <LinearProgress
            key={i}
            variant="determinate"
            value={i < index ? 100 : i === index ? progress : 0}
            sx={{
              flex: 1,
              height: 2.5,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.3)",
              "& .MuiLinearProgress-bar": { bgcolor: "#fff" },
            }}
          />
        ))}
      </Box>

      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={1.5}
        py={1}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ cursor: "pointer" }}
          onClick={() => {
            onClose();
            navigate(`/${current.user?.username}`);
          }}
        >
          <Avatar
            src={
              current.user?.avatar?.startsWith("http")
                ? current.user.avatar
                : current.user?.avatar
                ? `${API_URL}${current.user.avatar}`
                : undefined
            }
            sx={{ width: 32, height: 32 }}
          />
          <Typography color="#fff" fontWeight={600} fontSize={14}>
            {current.user?.username}
          </Typography>
        </Box>
        <Box>
          <IconButton
            size="small"
            onClick={() => setPaused((p) => !p)}
            sx={{ color: "#fff" }}
          >
            {paused ? <PlayArrow /> : <Pause />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setMuted((m) => !m)}
            sx={{ color: "#fff" }}
          >
            {muted ? <VolumeOff /> : <VolumeUp />}
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ color: "#fff" }}
          >
            <MoreHoriz />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "#fff" }}>
            <Close />
          </IconButton>
        </Box>
      </Box>

      {/* Media + tap zones */}
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        onClick={(e) => {
          const x = e.clientX;
          const w = window.innerWidth;
          if (x < w / 3) goPrev();
          else goNext();
        }}
      >
        {isVideo ? (
          <video
            src={fullUrl}
            autoPlay
            muted={muted}
            playsInline
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        ) : (
          <img
            src={fullUrl}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
          />
        )}
      </Box>

      {/* Bottom actions — reply / like / send */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1.5}
        py={1.5}
        onClick={(e) => e.stopPropagation()}
      >
        {!isOwn ? (
          <TextField
            fullWidth
            size="small"
            placeholder={`Reply to ${current.user?.username}...`}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                borderRadius: 5,
                bgcolor: "rgba(255,255,255,0.1)",
                "& fieldset": { borderColor: "rgba(255,255,255,0.35)" },
              },
            }}
          />
        ) : (
          <Box flex={1} />
        )}

        <IconButton
          onClick={() => setLiked((l) => !l)}
          sx={{ color: liked ? "#ff2d55" : "#fff" }}
        >
          {liked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>

        <IconButton onClick={handleSendReply} sx={{ color: "#fff" }}>
          <Send />
        </IconButton>

        <IconButton onClick={handleSave} sx={{ color: "#fff" }}>
          {saved ? <Bookmark /> : <BookmarkBorder />}
        </IconButton>
      </Box>

      {/* ⋯ menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        PaperProps={{ sx: { width: 280, borderRadius: 3 } }}
      >
        {isOwn && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            Delete
          </MenuItem>
        )}
        {isOwn && <MenuItem onClick={handleArchive}>Archive</MenuItem>}
        {!isOwn && (
          <MenuItem onClick={handleReport} sx={{ color: "error.main" }}>
            Report
          </MenuItem>
        )}
        {!isOwn && <MenuItem onClick={handleMute}>Mute</MenuItem>}
        <MenuItem onClick={handleSave}>
          {saved ? "Unsave" : "Save"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setAboutOpen(true);
          }}
        >
          About this account
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setMenuAnchor(null)}>Cancel</MenuItem>
      </Menu>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle textAlign="center">About this account</DialogTitle>
        <DialogContent sx={{ textAlign: "center" }}>
          <Avatar
            src={
              current.user?.avatar?.startsWith("http")
                ? current.user.avatar
                : current.user?.avatar
                ? `${API_URL}${current.user.avatar}`
                : undefined
            }
            sx={{ width: 80, height: 80, mx: "auto", mb: 1 }}
          />
          <Typography fontWeight={700}>{current.user?.username}</Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {current.user?.location || "Location not set"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={() => setAboutOpen(false)}>
            Close
          </Button>
          <Button
            fullWidth
            onClick={() => {
              setAboutOpen(false);
              onClose();
              navigate(`/${current.user?.username}`);
            }}
          >
            View profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default StoryViewer;