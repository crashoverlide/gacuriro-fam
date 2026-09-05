import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  TextField,
  Button,
  Avatar,
  Divider,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import PostCard from "../components/PostCard";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function PostDetail() {
  const { postId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!postId || postId === "undefined") {
        setError("Invalid post");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Post not found");
        }
        const p = data.post || data;
        setPost({
          ...p,
          id: p.id || p._id,
          _id: p._id || p.id,
          mediaUrl: p.mediaUrl || p.media_url,
        });
        setComments(data.comments || []);
      } catch (e) {
        setError(e.message || "Failed to load");
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [postId, token]);

  const sendComment = async () => {
    if (!text.trim() || !postId) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const c = data.comment || {
          id: Date.now().toString(),
          text: text.trim(),
          user: {
            username: user?.username,
            avatar: user?.avatar,
          },
        };
        setComments((prev) => [...prev, c]);
        setText("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return (
      <Box px={2} py={4}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography color="error" textAlign="center">
          {error || "Post not found"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", pb: 10 }}>
      <Box display="flex" alignItems="center" gap={1} px={1} py={1}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700}>Post</Typography>
      </Box>

      <PostCard post={post} />

      <Divider />
      <Typography fontWeight={700} px={2} pt={2} pb={1}>
        Comments
      </Typography>

      <Box px={2} pb={2}>
        {comments.length === 0 ? (
          <Typography color="text.secondary" fontSize={14}>
            No comments yet
          </Typography>
        ) : (
          comments.map((c) => {
            const key = c.id || c._id || `${c.text}-${c.createdAt}`;
            const uname = c.user?.username || c.username || "user";
            return (
              <Box key={key} display="flex" gap={1.5} mb={1.5}>
                <Avatar
                  src={mediaSrc(c.user?.avatar)}
                  sx={{ width: 32, height: 32 }}
                  component={Link}
                  to={`/${uname}`}
                >
                  {uname[0]?.toUpperCase()}
                </Avatar>
                <Box>
                  <Typography fontSize={14}>
                    <Box component="span" fontWeight={700} mr={0.75}>
                      {uname}
                    </Box>
                    {c.text}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box display="flex" gap={1} px={2} pb={2}>
        <TextField
          fullWidth
          size="small"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendComment()}
        />
        <Button onClick={sendComment} disabled={!text.trim()}>
          Post
        </Button>
      </Box>
    </Box>
  );
}

export default PostDetail;