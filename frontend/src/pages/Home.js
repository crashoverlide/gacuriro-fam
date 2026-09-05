import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Avatar,
  Chip,
} from "@mui/material";
import { Event, ChevronRight, Videocam, Lock } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import StoryBar from "../components/StoryBar";
import PostCard from "../components/PostCard";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function Home() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [famLinks, setFamLinks] = useState([]);
  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setPosts(data.posts || []);
    } catch {
      setPosts([]);
    }
  }, [token]);

  const fetchFam = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/fam-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setFamLinks(data.links || []);
    } catch {
      setFamLinks([]);
    }
  }, [token]);

  const fetchLive = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setLives(data.sessions || []);
    } catch {
      setLives([]);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([fetchFeed(), fetchFam(), fetchLive()]).finally(() =>
      setLoading(false)
    );
  }, [token, fetchFeed, fetchFam, fetchLive]);

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", pb: 10 }}>
      <StoryBar />

      {/* ——— LIVE PERSPECTIVE ——— */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Videocam sx={{ color: "#e11d48", fontSize: 22 }} />
            <Typography fontWeight={800} fontSize={15}>
              Live Perspective
            </Typography>
            {lives.length > 0 && (
              <Chip
                size="small"
                label={`${lives.length} live`}
                sx={{
                  height: 20,
                  bgcolor: "#e11d48",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              />
            )}
          </Box>
          <Button
            component={Link}
            to="/live"
            size="small"
            endIcon={<ChevronRight />}
            sx={{ textTransform: "none", fontWeight: 700, color: "#e11d48" }}
          >
            {lives.length ? "Watch" : "Go live"}
          </Button>
        </Box>

        <Box
          display="flex"
          gap={1.5}
          sx={{
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Box
            component={Link}
            to="/live"
            sx={{
              minWidth: 72,
              textAlign: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mx: "auto",
                bgcolor: "#1a1a1a",
                border: "2px solid #e11d48",
                color: "#e11d48",
              }}
            >
              <Videocam />
            </Avatar>
            <Typography fontSize={11} mt={0.5} noWrap>
              Go live
            </Typography>
          </Box>

          {lives.slice(0, 8).map((s) => (
            <Box
              key={s.id}
              component={Link}
              to={`/live/${s.id}`}
              sx={{
                minWidth: 72,
                textAlign: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  mx: "auto",
                  bgcolor: "#7f1d1d",
                  border: "2px solid #e11d48",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                LIVE
              </Avatar>
              <Typography fontSize={11} mt={0.5} noWrap maxWidth={72}>
                {s.title}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ——— FAM LINKS ——— */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Event sx={{ color: "#ff2d8a", fontSize: 22 }} />
            <Typography fontWeight={800} fontSize={15}>
              Fam Links
            </Typography>
          </Box>
          <Button
            component={Link}
            to="/fam"
            size="small"
            endIcon={<ChevronRight />}
            sx={{ textTransform: "none", fontWeight: 700, color: "#0095f6" }}
          >
            See all
          </Button>
        </Box>

        <Box
          display="flex"
          gap={1.5}
          sx={{
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Box
            component={Link}
            to="/fam"
            sx={{
              minWidth: 72,
              textAlign: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Avatar
              sx={{
                width: 64,
                height: 64,
                mx: "auto",
                bgcolor: "#1a1a1a",
                border: "2px dashed #ff2d8a",
                color: "#ff2d8a",
                fontSize: 28,
              }}
            >
              +
            </Avatar>
            <Typography fontSize={11} mt={0.5} noWrap>
              New link
            </Typography>
          </Box>

          {famLinks.slice(0, 8).map((link) => (
            <Box
              key={link.id}
              component={Link}
              to={`/fam/${link.id}`}
              sx={{
                minWidth: 72,
                textAlign: "center",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Avatar
                src={mediaSrc(link.cover_url)}
                sx={{
                  width: 64,
                  height: 64,
                  mx: "auto",
                  bgcolor: "#6C4DF6",
                  border: "2px solid #ff2d8a",
                }}
              >
                {(link.title || "F")[0]}
              </Avatar>
              <Typography fontSize={11} mt={0.5} noWrap maxWidth={72}>
                {link.title}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ——— FUTURE DROP shortcut ——— */}
      <Box
        component={Link}
        to="/future-drops"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.25,
          textDecoration: "none",
          color: "inherit",
          borderBottom: "1px solid",
          borderColor: "divider",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Avatar sx={{ bgcolor: "#3b0764", width: 40, height: 40 }}>
          <Lock sx={{ color: "#ff2d8a", fontSize: 20 }} />
        </Avatar>
        <Box flex={1}>
          <Typography fontWeight={700} fontSize={14}>
            Future Drops
          </Typography>
          <Typography fontSize={12} color="text.secondary">
            Time-locked messages for later
          </Typography>
        </Box>
        <ChevronRight color="disabled" />
      </Box>

      {/* Feed */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : posts.length === 0 ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          No posts yet — follow people or create one
        </Typography>
      ) : (
        posts.map((p) => <PostCard key={p.id || p._id} post={p} />)
      )}
    </Box>
  );
}

export default Home;