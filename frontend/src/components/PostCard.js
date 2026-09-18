import React, { useState, useRef } from "react";
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Button,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  FavoriteBorder,
  Favorite,
  ChatBubbleOutline,
  Send,
  BookmarkBorder,
  Bookmark,
  MoreHoriz,
  VolumeOff,
  VolumeUp,
  Repeat,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL, mediaUrl } from "../utils/api";
import CommentsDrawer from "./CommentsDrawer";

function PostCard({ post, onUpdated }) {
  const { token, user } = useAuth();
  const [liked, setLiked] = useState(!!post.liked_by_me || !!post.liked);
  const [likes, setLikes] = useState(post.likes_count || post.likesCount || 0);
  const [saved, setSaved] = useState(!!post.saved);
  const [muted, setMuted] = useState(() => {
    const v = localStorage.getItem("gf_reels_muted");
    return v === null ? true : v === "1";
  });
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [heart, setHeart] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [following, setFollowing] = useState(!!post.following_author);
  const videoRef = useRef(null);

  const author = post.users || post.user || post.author || {};
  const username = author.username || post.username || "user";
  const avatar = author.avatar ? mediaUrl(author.avatar) : undefined;
  const media = post.media_url || post.mediaUrl || post.image || "";
  const isVideo =
    post.media_type === "video" ||
    post.is_reel ||
    /\.(mp4|webm|mov)$/i.test(media || "");
  const postId = post.id || post._id;
  const caption = post.caption || post.text || "";

  const toggleMute = (e) => {
    e?.stopPropagation?.();
    const next = !muted;
    setMuted(next);
    localStorage.setItem("gf_reels_muted", next ? "1" : "0");
    if (videoRef.current) videoRef.current.muted = next;
  };

  const doLike = async () => {
    const prevLiked = liked;
    const prevLikes = likes;
    setLiked(!prevLiked);
    setLikes(prevLikes + (prevLiked ? -1 : 1));
    if (!prevLiked) {
      setHeart(true);
      setTimeout(() => setHeart(false), 700);
    }
    try {
      const res = await fetch(`${API_URL}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.liked === "boolean") {
        setLiked(data.liked);
      }
      onUpdated && onUpdated();
    } catch (e) {
      setLiked(prevLiked);
      setLikes(prevLikes);
    }
  };

  const onDoubleTap = () => {
    if (!liked) doLike();
    else {
      setHeart(true);
      setTimeout(() => setHeart(false), 700);
    }
  };

  const followAuthor = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/${author.id || username}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setFollowing(true);
    } catch (e) {
      console.error(e);
    }
  };

  const isMe =
    String(author.id || author._id) === String(user?.id || user?._id) ||
    username === user?.username;

  return (
    <Card
      elevation={0}
      sx={{
        maxWidth: 540,
        mx: "auto",
        mb: 2.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      <CardHeader
        avatar={
          <Avatar component={Link} to={`/${username}`} src={avatar}>
            {username[0]?.toUpperCase()}
          </Avatar>
        }
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography
              component={Link}
              to={`/${username}`}
              fontWeight={700}
              fontSize={14}
              sx={{ textDecoration: "none", color: "inherit" }}
            >
              {username}
            </Typography>
            {!isMe && !following && (
              <Button
                size="small"
                onClick={followAuthor}
                sx={{ textTransform: "none", fontWeight: 700, minWidth: 0, p: 0 }}
              >
                Follow
              </Button>
            )}
          </Box>
        }
        subheader={post.location || null}
        action={
          <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreHoriz />
          </IconButton>
        }
        sx={{ py: 1, "& .MuiCardHeader-title": { fontSize: 14 } }}
      />

      <Box
        onDoubleClick={onDoubleTap}
        sx={{ position: "relative", bgcolor: "#000", lineHeight: 0 }}
      >
        {isVideo ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl(media)}
              muted={muted}
              playsInline
              loop
              controls={false}
              onClick={(e) => {
                const v = e.currentTarget;
                if (v.paused) v.play().catch(() => {});
                else v.pause();
              }}
              style={{ width: "100%", maxHeight: 620, objectFit: "contain" }}
            />
            <IconButton
              onClick={toggleMute}
              sx={{
                position: "absolute",
                right: 8,
                bottom: 8,
                bgcolor: "rgba(0,0,0,0.55)",
                color: "#fff",
                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
              }}
              size="small"
            >
              {muted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
            </IconButton>
          </>
        ) : (
          <img
            src={mediaUrl(media)}
            alt=""
            style={{ width: "100%", maxHeight: 620, objectFit: "cover", display: "block" }}
          />
        )}

        {heart && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              animation: "heartPop 0.7s ease",
              "@keyframes heartPop": {
                "0%": { transform: "scale(0.4)", opacity: 0 },
                "40%": { transform: "scale(1.15)", opacity: 1 },
                "100%": { transform: "scale(1)", opacity: 0 },
              },
            }}
          >
            <Favorite sx={{ fontSize: 90, color: "#fff" }} />
          </Box>
        )}
      </Box>

      <CardActions disableSpacing sx={{ px: 0.5, pt: 0.5 }}>
        <IconButton onClick={doLike} sx={{ transition: "transform 0.15s", "&:active": { transform: "scale(0.85)" } }}>
          {liked ? <Favorite sx={{ color: "#ed4956" }} /> : <FavoriteBorder />}
        </IconButton>
        <IconButton
          onClick={() => setCommentsOpen(true)}
          sx={{ transition: "transform 0.15s", "&:active": { transform: "scale(0.85)" } }}
        >
          <ChatBubbleOutline />
        </IconButton>
        <IconButton sx={{ transition: "transform 0.15s", "&:active": { transform: "scale(0.85)" } }}>
          <Send />
        </IconButton>
        <IconButton sx={{ transition: "transform 0.15s", "&:active": { transform: "scale(0.85)" } }}>
          <Repeat />
        </IconButton>
        <Box flex={1} />
        <IconButton onClick={() => setSaved((s) => !s)}>
          {saved ? <Bookmark /> : <BookmarkBorder />}
        </IconButton>
      </CardActions>

      <CardContent sx={{ pt: 0, pb: "12px !important" }}>
        <Typography fontWeight={700} fontSize={14}>
          {likes.toLocaleString()} likes
        </Typography>
        {caption && (
          <Typography fontSize={14} mt={0.5}>
            <Box component={Link} to={`/${username}`} sx={{ fontWeight: 700, mr: 0.7, textDecoration: "none", color: "inherit" }}>
              {username}
            </Box>
            {caption}
          </Typography>
        )}
        <Typography
          fontSize={13}
          color="text.secondary"
          mt={0.5}
          sx={{ cursor: "pointer" }}
          onClick={() => setCommentsOpen(true)}
        >
          View all comments
        </Typography>
      </CardContent>

      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem component={Link} to={`/post/${postId}`} onClick={() => setAnchor(null)}>
          Go to post
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigator.clipboard?.writeText(`${window.location.origin}/post/${postId}`);
            setAnchor(null);
          }}
        >
          Copy link
        </MenuItem>
        <MenuItem component={Link} to={`/${username}`} onClick={() => setAnchor(null)}>
          About this account
        </MenuItem>
      </Menu>

      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={postId}
        postMedia={media}
        isVideo={isVideo}
      />
    </Card>
  );
}

export default PostCard;