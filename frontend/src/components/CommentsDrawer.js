import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Drawer,
  Dialog,
  Typography,
  IconButton,
  Avatar,
  TextField,
  CircularProgress,
  useMediaQuery,
  Button,
} from "@mui/material";
import { Close, FavoriteBorder, Favorite, Send } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAuth } from "../context/AuthContext";
import { API_URL, mediaUrl } from "../utils/api";
import { formatDistanceToNow } from "date-fns";

function timeAgo(d) {
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "";
  }
}

function CommentRow({ c, onLike, onReply }) {
  const liked = !!c.liked_by_me;
  const user = c.user || c.author || {};
  const name = user.username || user.fullName || "user";
  const avatar = user.avatar ? mediaUrl(user.avatar) : undefined;

  return (
    <Box display="flex" gap={1.2} px={2} py={1.2} alignItems="flex-start">
      <Avatar
        component={Link}
        to={`/${name}`}
        src={avatar}
        sx={{ width: 32, height: 32, mt: 0.3 }}
      >
        {name[0]?.toUpperCase()}
      </Avatar>
      <Box flex={1} minWidth={0}>
        <Typography fontSize={13} sx={{ lineHeight: 1.35, color: "#f5f5f5" }}>
          <Box
            component={Link}
            to={`/${name}`}
            sx={{
              fontWeight: 700,
              color: "#fff",
              textDecoration: "none",
              mr: 0.7,
            }}
          >
            {name}
          </Box>
          {c.text}
        </Typography>
        <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
          <Typography fontSize={11} color="#9a9a9a">
            {timeAgo(c.created_at || c.createdAt)}
          </Typography>
          {(c.likes_count > 0 || c.likesCount > 0) && (
            <Typography fontSize={11} color="#9a9a9a" fontWeight={600}>
              {c.likes_count || c.likesCount} likes
            </Typography>
          )}
          <Typography
            fontSize={11}
            color="#cfcfcf"
            fontWeight={700}
            sx={{ cursor: "pointer" }}
            onClick={() => onReply(c)}
          >
            Reply
          </Typography>
        </Box>
        {(c.replies || []).map((r) => (
          <Box key={r.id || r._id} mt={1.2} ml={0.5}>
            <CommentRow c={r} onLike={onLike} onReply={onReply} />
          </Box>
        ))}
      </Box>
      <IconButton size="small" onClick={() => onLike(c)} sx={{ mt: 0.2 }}>
        {liked ? (
          <Favorite sx={{ fontSize: 16, color: "#ff2d8a" }} />
        ) : (
          <FavoriteBorder sx={{ fontSize: 16, color: "#ccc" }} />
        )}
      </IconButton>
    </Box>
  );
}

function CommentsDrawer({ open, onClose, postId, postMedia, isVideo }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { token, user } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);

  const load = async () => {
    if (!postId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setComments(data.comments || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      load();
      setReplyTo(null);
      setText("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  const submit = async () => {
    const body = text.trim();
    if (!body || !postId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: body,
          parentId: replyTo?.id || replyTo?._id || null,
        }),
      });
      if (res.ok) {
        setText("");
        setReplyTo(null);
        await load();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const likeComment = async (c) => {
    const id = c.id || c._id;
    try {
      const res = await fetch(`${API_URL}/api/posts/comments/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await load();
    } catch (e) {
      console.error(e);
    }
  };

  const onReply = (c) => {
    setReplyTo(c);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const mediaSrc = postMedia ? mediaUrl(postMedia) : "";

  const panelBg = "#121212";
  const pink = "#ff2d8a";

  const list = (
    <Box
      display="flex"
      flexDirection="column"
      height="100%"
      sx={{ bgcolor: panelBg, color: "#fff" }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1.2}
        borderBottom="1px solid #2a2a2a"
      >
        <Typography fontWeight={800} color="#fff">
          Comments
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "#fff" }}>
          <Close />
        </IconButton>
      </Box>

      <Box flex={1} overflow="auto">
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} sx={{ color: pink }} />
          </Box>
        ) : !comments.length ? (
          <Box textAlign="center" py={6} px={3}>
            <Typography fontWeight={800} mb={0.5} color="#fff">
              No comments yet
            </Typography>
            <Typography color="#9a9a9a" fontSize={14}>
              Start the conversation.
            </Typography>
          </Box>
        ) : (
          comments.map((c) => (
            <CommentRow
              key={c.id || c._id}
              c={c}
              onLike={likeComment}
              onReply={onReply}
            />
          ))
        )}
      </Box>

      {replyTo && (
        <Box
          px={2}
          pt={1}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          borderTop="1px solid #2a2a2a"
        >
          <Typography fontSize={12} color="#aaa">
            Replying to @
            {(replyTo.user || replyTo.author || {}).username || "user"}
          </Typography>
          <Button size="small" onClick={() => setReplyTo(null)} sx={{ color: pink }}>
            Cancel
          </Button>
        </Box>
      )}

      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1.5}
        borderTop="1px solid #2a2a2a"
        bgcolor="#0d0d0d"
      >
        <Avatar
          src={user?.avatar ? mediaUrl(user.avatar) : undefined}
          sx={{ width: 32, height: 32 }}
        >
          {(user?.username || "?")[0]?.toUpperCase()}
        </Avatar>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 5,
              color: "#fff",
              bgcolor: "#1a1a1a",
              "& fieldset": { borderColor: "#333" },
              "&:hover fieldset": { borderColor: pink },
              "&.Mui-focused fieldset": { borderColor: pink },
            },
            "& .MuiInputBase-input::placeholder": { color: "#888", opacity: 1 },
          }}
        />
        <IconButton
          onClick={submit}
          disabled={sending || !text.trim()}
          sx={{ color: pink }}
        >
          {sending ? <CircularProgress size={18} sx={{ color: pink }} /> : <Send />}
        </IconButton>
      </Box>
    </Box>
  );

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: "min(90vh, 720px)",
            maxHeight: "90vh",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#000",
          },
        }}
      >
        <Box display="flex" height="100%">
          <Box
            flex={1.2}
            bgcolor="#000"
            display="flex"
            alignItems="center"
            justifyContent="center"
            minWidth={0}
          >
            {mediaSrc ? (
              isVideo ? (
                <video
                  src={mediaSrc}
                  controls
                  autoPlay
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              ) : (
                <img
                  src={mediaSrc}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )
            ) : null}
          </Box>
          <Box width={400} maxWidth="42%" borderLeft="1px solid #2a2a2a">
            {list}
          </Box>
        </Box>
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: "78vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: panelBg,
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 4,
          bgcolor: "#444",
          borderRadius: 2,
          mx: "auto",
          mt: 1,
          mb: 0.5,
        }}
      />
      {list}
    </Drawer>
  );
}

export default CommentsDrawer;