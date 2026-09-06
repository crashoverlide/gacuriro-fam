import React, { useRef, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Card,
  CardHeader,
  CardContent,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Button,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  FavoriteBorder,
  Favorite,
  ChatBubbleOutline,
  Send,
  MoreHoriz,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { mediaUrl } from "../utils/api";

function PostCard({ post }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const lastTap = useRef(0);

  const [liked, setLiked] = useState(Boolean(post?.liked));
  const [likes, setLikes] = useState(post?.likesCount ?? post?.likes_count ?? 0);
  const [showHeart, setShowHeart] = useState(false);
  const [menuEl, setMenuEl] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [following, setFollowing] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const author = post?.user || {};
  const username = author.username || "user";
  const postId = post?.id || post?._id;

  const raw =
    post?.mediaUrl ||
    post?.media_url ||
    post?.media?.[0]?.url ||
    post?.image ||
    "";
  const src = mediaUrl(raw);

  const isVideo =
    post?.isReel ||
    post?.is_reel ||
    post?.mediaType === "video" ||
    post?.media_type === "video" ||
    /\.(mp4|webm|mov)(\?|$)/i.test(raw || "");

  const doLike = async () => {
    if (!postId) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));

    if (next) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }

    try {
      await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // rollback if failed
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) doLike();
      else {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 800);
      }
    }
    lastTap.current = now;
  };

  const openComments = async () => {
    setCommentsOpen(true);
    if (!postId) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setComments(data.comments || []);
    } catch {
      setComments([]);
    }
  };

  const sendComment = async () => {
    if (!commentText.trim() || !postId) return;
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setComments((prev) => [
          ...prev,
          data.comment || {
            id: Date.now().toString(),
            text: commentText.trim(),
            user: { username: user?.username, avatar: user?.avatar },
          },
        ]);
        setCommentText("");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openShare = async () => {
    setShareOpen(true);
    setShareLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/users/${encodeURIComponent(user.username)}/following`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      setFollowing(data.users || []);
    } catch {
      setFollowing([]);
    } finally {
      setShareLoading(false);
    }
  };

  const sendToUser = async (target) => {
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: target.id || target._id }),
      });
      const data = await res.json().catch(() => ({}));
      const cid = data.conversation?.id || data.conversation?._id;
      if (cid) {
        await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: cid,
            text: `Shared a post: ${window.location.origin}/post/${postId}`,
          }),
        });
        setShareOpen(false);
        navigate(`/messages/${cid}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard?.writeText(url);
    setMenuEl(null);
  };

  return (
    <Card
      elevation={0}
      sx={{
        bgcolor: "#000",
        color: "#fff",
        borderRadius: 0,
        borderBottom: "1px solid #222",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <CardHeader
        avatar={
          <Avatar
            src={mediaUrl(author.avatar)}
            component={Link}
            to={`/${username}`}
            sx={{ width: 36, height: 36, bgcolor: "#333" }}
          >
            {username[0]?.toUpperCase()}
          </Avatar>
        }
        title={
          <Typography
            component={Link}
            to={`/${username}`}
            fontWeight={700}
            fontSize={14}
            sx={{ color: "#fff", textDecoration: "none" }}
          >
            {username}
          </Typography>
        }
        action={
          <>
            <IconButton
              sx={{ color: "#fff" }}
              onClick={(e) => setMenuEl(e.currentTarget)}
            >
              <MoreHoriz />
            </IconButton>
            <Menu
              anchorEl={menuEl}
              open={Boolean(menuEl)}
              onClose={() => setMenuEl(null)}
            >
              <MenuItem
                onClick={() => {
                  setMenuEl(null);
                  navigate(`/post/${postId}`);
                }}
              >
                Go to post
              </MenuItem>
              <MenuItem onClick={copyLink}>Copy link</MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuEl(null);
                  openShare();
                }}
              >
                Share to…
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuEl(null);
                  navigate(`/${username}`);
                }}
              >
                About this account
              </MenuItem>
            </Menu>
          </>
        }
        sx={{ py: 1, px: 1.5 }}
      />

      {/* Media */}
      <Box
        onClick={onMediaTap}
        sx={{
          position: "relative",
          width: "100%",
          bgcolor: "#111",
          minHeight: 280,
          maxHeight: 560,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {!src || imgError ? (
          <Typography color="#555" fontSize={13}>
            Media unavailable
          </Typography>
        ) : isVideo ? (
          <video
            src={src}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            style={{
              width: "100%",
              maxHeight: 560,
              objectFit: "contain",
              display: "block",
              background: "#000",
            }}
          />
        ) : (
          <img
            src={src}
            alt=""
            onError={() => setImgError(true)}
            style={{
              width: "100%",
              maxHeight: 560,
              objectFit: "contain",
              display: "block",
            }}
          />
        )}

        {/* Double-tap heart animation */}
        <Fade in={showHeart}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Favorite sx={{ fontSize: 90, color: "#fff", filter: "drop-shadow(0 0 8px rgba(0,0,0,0.5))" }} />
          </Box>
        </Fade>
      </Box>

      {/* Actions */}
      <Box display="flex" alignItems="center" px={0.5} pt={0.5}>
        <IconButton onClick={doLike} sx={{ color: liked ? "#ff2d8a" : "#fff" }}>
          {liked ? <Favorite /> : <FavoriteBorder />}
        </IconButton>
        <IconButton onClick={openComments} sx={{ color: "#fff" }}>
          <ChatBubbleOutline />
        </IconButton>
        <IconButton onClick={openShare} sx={{ color: "#fff" }}>
          <Send />
        </IconButton>
      </Box>

      <CardContent sx={{ pt: 0, pb: 1.5, px: 1.5 }}>
        <Typography fontWeight={700} fontSize={14}>
          {likes} likes
        </Typography>
        {post?.caption ? (
          <Typography fontSize={14} mt={0.5}>
            <Box component="span" fontWeight={700} mr={0.75}>
              {username}
            </Box>
            {post.caption}
          </Typography>
        ) : null}
        <Typography
          fontSize={13}
          color="#888"
          sx={{ cursor: "pointer", mt: 0.5 }}
          onClick={openComments}
        >
          View comments
        </Typography>
      </CardContent>

      {/* Comments Dialog */}
      <Dialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Comments</DialogTitle>
        <DialogContent>
          {comments.length === 0 ? (
            <Typography color="text.secondary" fontSize={14}>
              No comments yet
            </Typography>
          ) : (
            comments.map((c) => (
              <Box key={c.id || c._id} display="flex" gap={1} mb={1.5}>
                <Avatar
                  src={mediaUrl(c.user?.avatar)}
                  sx={{ width: 32, height: 32 }}
                >
                  {(c.user?.username || "U")[0]}
                </Avatar>
                <Typography fontSize={14}>
                  <b>{c.user?.username || "user"}</b> {c.text}
                </Typography>
              </Box>
            ))
          )}
          <Box display="flex" gap={1} mt={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
            />
            <Button onClick={sendComment}>Post</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Send to</DialogTitle>
        <DialogContent>
          {shareLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          ) : following.length === 0 ? (
            <Typography color="text.secondary">
              Follow people to send posts to them
            </Typography>
          ) : (
            <List>
              {following.map((u) => (
                <ListItem
                  key={u.id || u._id}
                  button
                  onClick={() => sendToUser(u)}
                >
                  <ListItemAvatar>
                    <Avatar src={mediaUrl(u.avatar)}>
                      {(u.username || "U")[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.username} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PostCard;