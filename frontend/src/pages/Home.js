import React, { useEffect, useState, useCallback } from "react";
import { Box, CircularProgress, Typography, Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../utils/api";
import PostCard from "../components/PostCard";
import StoryBar from "../components/StoryBar";

function Home() {
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      // try feed first, then explore as fallback (all public posts)
      let res = await fetch(`${API_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let data = await res.json().catch(() => ({}));

      if (!res.ok) {
        res = await fetch(`${API_URL}/api/posts/explore`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        data = await res.json().catch(() => ({}));
      }

      if (!res.ok) {
        throw new Error(data.message || `Feed error ${res.status}`);
      }

      const list = data.posts || data || [];
      setPosts(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load feed");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return (
    <Box sx={{ maxWidth: 540, mx: "auto", pb: 10, pt: 1, px: { xs: 0, sm: 1 } }}>
      <StoryBar />

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!!error && !loading && (
        <Box textAlign="center" py={4} px={2}>
          <Typography color="error" mb={1}>
            {error}
          </Typography>
          <Button variant="outlined" onClick={fetchFeed}>
            Retry
          </Button>
        </Box>
      )}

      {!loading &&
        posts.map((p) => (
          <PostCard key={p.id || p._id} post={p} onUpdated={fetchFeed} />
        ))}

      {!loading && !error && posts.length === 0 && (
        <Box textAlign="center" py={6} px={2}>
          <Typography fontWeight={700} mb={1}>
            No posts yet
          </Typography>
          <Typography color="text.secondary" fontSize={14} mb={2}>
            Create a post or wait for others. Home shows recent posts from
            everyone.
          </Typography>
          <Button variant="contained" href="/create">
            Create
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default Home;