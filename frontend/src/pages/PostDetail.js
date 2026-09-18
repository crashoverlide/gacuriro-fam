import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, IconButton } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../utils/api";
import PostCard from "../components/PostCard";

function PostDetail() {
  const { postId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      if (!token || !postId) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Post not found");
        if (!dead) setPost(data.post || data);
      } catch (e) {
        if (!dead) setError(e.message || "Failed to load");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [token, postId]);

  return (
    <Box sx={{ maxWidth: 540, mx: "auto", pb: 10 }}>
      <Box display="flex" alignItems="center" gap={1} px={1} py={1}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800}>Post</Typography>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      )}

      {!!error && !loading && (
        <Typography color="error" textAlign="center" py={4}>
          {error}
        </Typography>
      )}

      {!loading && post && <PostCard post={post} />}
    </Box>
  );
}

export default PostDetail;