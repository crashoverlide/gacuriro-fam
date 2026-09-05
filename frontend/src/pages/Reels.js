import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Send,
  VolumeOff,
  VolumeUp,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function ReelItem({ post, active }) {
  const videoRef = useRef(null);
  const { token } = useAuth();
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const src = mediaSrc(post.mediaUrl || post.media_url);
  const username = post.user?.username || "user";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {});
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const toggleLike = async () => {
    setLiked((x) => !x);
    try {
      await fetch(`${API_URL}/api/posts/${post.id || post._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (_) {}
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        position: "relative",
        bgcolor: "#000",
        scrollSnapAlign: "start",
      }}
    >
      <video
        ref={videoRef}
        src={src}
        loop
        playsInline
        muted={muted}
        autoPlay={active}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      <IconButton
        onClick={() => setMuted((m) => !m)}
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          bgcolor: "rgba(0,0,0,0.4)",
          color: "#fff",
        }}
      >
        {muted ? <VolumeOff /> : <VolumeUp />}
      </IconButton>

      <Box
        sx={{
          position: "absolute",
          right: 10,
          bottom: 100,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "center",
        }}
      >
        <IconButton onClick={toggleLike} sx={{ color: liked ? "#ff2d8a" : "#fff" }}>
          {liked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
        <IconButton
          component={Link}
          to={`/post/${post.id || post._id}`}
          sx={{ color: "#fff" }}
        >
          <ChatBubbleOutline />
        </IconButton>
        <IconButton sx={{ color: "#fff" }}>
          <Send />
        </IconButton>
      </Box>

      <Box sx={{ position: "absolute", left: 12, bottom: 80, right: 70 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Avatar
            src={mediaSrc(post.user?.avatar)}
            component={Link}
            to={`/${username}`}
            sx={{ width: 32, height: 32 }}
          />
          <Typography
            component={Link}
            to={`/${username}`}
            fontWeight={700}
            fontSize={14}
            sx={{ color: "#fff", textDecoration: "none" }}
          >
            {username}
          </Typography>
        </Box>
        {post.caption ? (
          <Typography fontSize={14} color="#fff" noWrap>
            {post.caption}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}

export default function Reels() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/posts/reels`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        let list = data.posts || [];
        if (!list.length) {
          const res2 = await fetch(`${API_URL}/api/posts/feed`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const d2 = await res2.json().catch(() => ({}));
          list = (d2.posts || []).filter(
            (p) =>
              p.isReel ||
              p.is_reel ||
              p.mediaType === "video" ||
              p.media_type === "video"
          );
        }
        setPosts(list);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const onScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    setActive(i);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor="#000"
      >
        <CircularProgress sx={{ color: "#ff2d8a" }} />
      </Box>
    );
  }

  if (!posts.length) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        bgcolor="#000"
        color="#fff"
      >
        <Typography>No reels yet — upload a video</Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      onScroll={onScroll}
      sx={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        bgcolor: "#000",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      {posts.map((p, i) => (
        <Box key={p.id || p._id} sx={{ height: "100vh" }}>
          <ReelItem post={p} active={i === active} />
        </Box>
      ))}
    </Box>
  );
}