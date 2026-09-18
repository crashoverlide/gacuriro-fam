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
      const res = await fetch(`${API_URL}/api/posts/feed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load feed");
      setPosts(data.posts || data || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return (
    <Box sx={{ maxWidth: 540, mx: "auto", pb: 10, pt: 1 }}>
      <StoryBar />

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!!error && !loading && (
        <Box textAlign="center" py={4}>
          <Typography color="error" mb={1}>
            {error}
          </Typography>
          <Button onClick={fetchFeed}>Retry</Button>
        </Box>
      )}

      {!loading &&
        posts.map((p) => (
          <PostCard key={p.id || p._id} post={p} onUpdated={fetchFeed} />
        ))}

      {!loading && !posts.length && !error && (
        <Typography textAlign="center" color="text.secondary" py={6}>
          No posts yet — follow people or create one.
        </Typography>
      )}
    </Box>
  );
}

export default Home;