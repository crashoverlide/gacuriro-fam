import React, { useEffect, useState, useRef } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Avatar,
  TextField,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Dialog,
  keyframes,
} from "@mui/material";
import {
  Close,
  FavoriteBorder,
  Favorite,
  Send,
  Mood,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL, mediaUrl } from "../utils/api";

const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0.6; }
  to { transform: translateY(0); opacity: 1; }
`;

function timeAgo(date) {
  if (!date) return "";
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function CommentRow({ c, onLike, onReply }) {
  const src = (a) => {
    if (!a) return undefined;
    if (a.startsWith("http")) return a;
    return mediaUrl ? mediaUrl(a) : `${API_URL}${a}`;
  };
  const u = c.user || {};
  const username = u.username || c.username || "user";

  return (
    <Box display="flex" gap={1.2} px={2} py={1.2} alignItems="flex-start">
      <Avatar
        component={Link}
        to={`/${username}`}
        src={src(u.avatar)}
        sx={{ width: 36, height: 36, mt: 0.3 }}
      />
      <Box flex={1} minWidth={0}>
        <Typography fontSize={13} sx={{ wordBreak: "break-word" }}>
          <Typography
            component={Link}
            to={`/${username}`}
            fontWeight={700}
            fontSize={13}
            color="inherit"
            sx={{ textDecoration: "none", mr: 0.6 }}
          >
            {username}
          </Typography>
          {c.text || c.content || c.body}
        </Typography>
        <Box display="flex" alignItems="center" gap={1.5} mt={0.5}>
          <Typography fontSize={11} color="text.secondary">
            {timeAgo(c.created_at || c.createdAt)}
          </Typography>
          {(c.likes_count > 0 || c.likesCount > 0) && (
            <Typography fontSize={11} color="text.secondary" fontWeight={600}>
              {c.likes_count || c.likesCount} likes
            </Typography>
          )}
          <Typography
            fontSize={11}
            color="text.secondary"
            fontWeight={600}
            sx={{ cursor: "pointer" }}
            onClick={() => onReply(c)}
          >
            Reply
          </Typography>
        </Box>

        {/* nested replies */}
        {(c.replies || []).map((r) => (
          <Box key={r.id || r._id} display="flex" gap={1} mt={1.2} ml={0.5}>
            <Avatar
              src={src(r.user?.avatar)}
              sx={{ width: 28, height: 28 }}
            />
            <Box>
              <Typography fontSize={12}>
                <b>{r.user?.username || r.username}</b> {r.text || r.content}
              </Typography>
              <Typography fontSize={10} color="text.secondary" mt={0.3}>
                {timeAgo(r.created_at || r.createdAt)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
      <IconButton size="small" onClick={() => onLike(c)} sx={{ mt: 0.5 }}>
        {c.liked || c.isLiked ? (
          <Favorite sx={{ fontSize: 14, color: "#ff2d55" }} />
        ) : (
          <FavoriteBorder sx={{ fontSize: 14 }} />
        )}
      </IconButton>
    </Box>
  );
}

function CommentsBody({
  postId,
  comments,
  setComments,
  loading,
  onClose,
  showClose,
}) {
  const { token, user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const src = (a) => {
    if (!a) return undefined;
    if (typeof a === "string" && a.startsWith("http")) return a;
    if (!a) return undefined;
    return mediaUrl ? mediaUrl(a) : `${API_URL}${a}`;
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const body = {
        text: text.trim(),
        parentId: replyTo?.id || replyTo?._id || null,
      };
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        const c = data.comment || data;
        if (replyTo) {
          setComments((prev) =>
            prev.map((item) => {
              const id = item.id || item._id;
              const pid = replyTo.id || replyTo._id;
              if (id === pid) {
                return {
                  ...item,
                  replies: [...(item.replies || []), c],
                };
              }
              return item;
            })
          );
        } else {
          setComments((prev) => [...prev, c]);
        }
        setText("");
        setReplyTo(null);
        setTimeout(() => {
          listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
          });
        }, 50);
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
      await fetch(`${API_URL}/api/posts/comments/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) =>
        prev.map((item) => {
          if ((item.id || item._id) === id) {
            const liked = !(item.liked || item.isLiked);
            return {
              ...item,
              liked,
              isLiked: liked,
              likes_count: Math.max(
                0,
                (item.likes_count || item.likesCount || 0) + (liked ? 1 : -1)
              ),
            };
          }
          return item;
        })
      );
    } catch (e) {
      // optimistic still ok
      setComments((prev) =>
        prev.map((item) =>
          (item.id || item._id) === id
            ? { ...item, liked: !item.liked, isLiked: !item.isLiked }
            : item
        )
      );
    }
  };

  const startReply = (c) => {
    setReplyTo(c);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
        py={1.5}
        borderBottom="1px solid #efefef"
      >
        <Typography fontWeight={800} fontSize={15}>
          Comments
        </Typography>
        {showClose && (
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 6 }}
          >
            <Close />
          </IconButton>
        )}
      </Box>

      {/* list */}
      <Box ref={listRef} flex={1} overflow="auto">
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={26} sx={{ color: "#ff2d8a" }} />
          </Box>
        ) : comments.length === 0 ? (
          <Box textAlign="center" py={6} px={3}>
            <Typography fontWeight={800} fontSize={18} mb={0.5}>
              No comments yet
            </Typography>
            <Typography color="text.secondary" fontSize={13}>
              Start the conversation.
            </Typography>
          </Box>
        ) : (
          comments.map((c) => (
            <CommentRow
              key={c.id || c._id}
              c={c}
              onLike={likeComment}
              onReply={startReply}
            />
          ))
        )}
      </Box>

      {/* reply chip */}
      {replyTo && (
        <Box
          px={2}
          py={0.8}
          bgcolor="#fafafa"
          borderTop="1px solid #efefef"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography fontSize={12} color="text.secondary">
            Replying to{" "}
            <b>@{replyTo.user?.username || replyTo.username}</b>
          </Typography>
          <IconButton size="small" onClick={() => setReplyTo(null)}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* input */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1.5}
        py={1.2}
        borderTop="1px solid #efefef"
      >
        <Avatar src={src(user?.avatar)} sx={{ width: 32, height: 32 }} />
        <Mood sx={{ color: "#8e8e8e", fontSize: 22 }} />
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="standard"
          placeholder={
            replyTo
              ? `Reply to @${replyTo.user?.username || replyTo.username}...`
              : "Add a comment..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          InputProps={{ disableUnderline: true }}
          sx={{ fontSize: 14 }}
        />
        <Typography
          onClick={send}
          sx={{
            color: text.trim() ? "#0095f6" : "#b2dffc",
            fontWeight: 700,
            fontSize: 14,
            cursor: text.trim() ? "pointer" : "default",
            userSelect: "none",
          }}
        >
          Post
        </Typography>
      </Box>
    </Box>
  );
}

function CommentsDrawer({ open, onClose, postId, postMedia, isVideo }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const { token } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const src = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return mediaUrl ? mediaUrl(url) : `${API_URL}${url}`;
  };

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setComments(data.comments || data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, postId, token]);

  // Desktop Instagram layout: media | comments
  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: 900,
            borderRadius: 2,
            overflow: "hidden",
            display: "flex",
            flexDirection: "row",
          },
        }}
      >
        <Box
          sx={{
            flex: "1 1 55%",
            bgcolor: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          {postMedia ? (
            isVideo ? (
              <video
                src={src(postMedia)}
                controls
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            ) : (
              <img
                src={src(postMedia)}
                alt=""
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
              />
            )
          ) : null}
        </Box>
        <Box
          sx={{
            flex: "1 1 45%",
            maxWidth: 420,
            borderLeft: "1px solid #efefef",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CommentsBody
            postId={postId}
            comments={comments}
            setComments={setComments}
            loading={loading}
            onClose={onClose}
            showClose
          />
        </Box>
      </Dialog>
    );
  }

  // Mobile: bottom sheet
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      transitionDuration={280}
      PaperProps={{
        sx: {
          height: "75vh",
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
          animation: open ? `${slideUp} 0.28s ease-out` : undefined,
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 4,
          bgcolor: "#dbdbdb",
          borderRadius: 2,
          mx: "auto",
          mt: 1,
        }}
      />
      <CommentsBody
        postId={postId}
        comments={comments}
        setComments={setComments}
        loading={loading}
        onClose={onClose}
        showClose
      />
    </Drawer>
  );
}

export default CommentsDrawer;