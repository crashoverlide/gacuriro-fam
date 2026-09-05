import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Stack,
  Snackbar,
  Alert,
  Fade,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Send,
  VolumeOff,
  VolumeUp,
  MusicNote,
  BookmarkBorder,
  Bookmark,
  Replay,
  AddCircleOutline,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CommentsDrawer from "./CommentsDrawer";
import ShareSheet from "./ShareSheet";

function ReelPlayer({ reel, isActive }) {
  const { token } = useAuth();
  const videoRef = useRef(null);

  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);
  const [saved, setSaved] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [comments, setComments] = useState(reel.comments || []);
  const [commentsCount, setCommentsCount] = useState(
    reel.commentsCount || reel.comments?.length || 0
  );
  const [showHeart, setShowHeart] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: "" });

  const videoUrl = reel.media?.[0]?.url || reel.video || "";
  const fullUrl = videoUrl.startsWith("http")
    ? videoUrl
    : `http://localhost:5000${videoUrl}`;

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  const toggleMute = (e) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const handleLike = async (e) => {
    e?.stopPropagation();
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((prev) => (newLiked ? prev + 1 : prev - 1));

    if (newLiked) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }

    try {
      await fetch(`http://localhost:5000/api/posts/${reel._id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (!liked) handleLike(e);
    else {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    }
  };

  const handleRepost = (e) => {
    e.stopPropagation();
    setSnack({ open: true, message: "Reposted to your feed" });
  };

  const handleAddToStory = (e) => {
    e.stopPropagation();
    setSnack({ open: true, message: "Added to your story" });
  };

  const handleSave = (e) => {
    e.stopPropagation();
    setSaved(!saved);
    setSnack({
      open: true,
      message: saved ? "Removed from saved" : "Saved",
    });
  };

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        bgcolor: "#000",
        overflow: "hidden",
      }}
      onDoubleClick={handleDoubleTap}
    >
      <video
        ref={videoRef}
        src={fullUrl}
        loop
        muted={muted}
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Double-tap heart animation */}
      <Fade in={showHeart}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          <Favorite
            sx={{
              fontSize: 110,
              color: "#fff",
              filter: "drop-shadow(0 0 12px rgba(255,48,64,0.8))",
              animation: "heartPop 0.8s ease",
              "@keyframes heartPop": {
                "0%": { transform: "scale(0)", opacity: 0 },
                "40%": { transform: "scale(1.2)", opacity: 1 },
                "100%": { transform: "scale(1)", opacity: 0 },
              },
            }}
          />
        </Box>
      </Fade>

      {/* Gradients */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 100,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Right actions */}
      <Stack
        spacing={2.2}
        sx={{
          position: "absolute",
          right: 10,
          bottom: 140,
          alignItems: "center",
          zIndex: 20,
        }}
      >
        <Box textAlign="center">
          <IconButton
            onClick={handleLike}
            sx={{ color: liked ? "#ff2d55" : "#fff" }}
          >
            {liked ? (
              <Favorite fontSize="large" />
            ) : (
              <FavoriteBorder fontSize="large" />
            )}
          </IconButton>
          <Typography
            variant="caption"
            color="#fff"
            fontWeight={600}
            display="block"
          >
            {likesCount > 0 ? likesCount : ""}
          </Typography>
        </Box>

        <Box textAlign="center">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setCommentsOpen(true);
            }}
            sx={{ color: "#fff" }}
          >
            <ChatBubbleOutline fontSize="large" />
          </IconButton>
          <Typography
            variant="caption"
            color="#fff"
            fontWeight={600}
            display="block"
          >
            {commentsCount > 0 ? commentsCount : ""}
          </Typography>
        </Box>

        {/* Repost */}
        <Box textAlign="center">
          <IconButton onClick={handleRepost} sx={{ color: "#fff" }}>
            <Replay fontSize="large" />
          </IconButton>
        </Box>

        {/* Send */}
        <Box textAlign="center">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              setShareOpen(true);
            }}
            sx={{ color: "#fff" }}
          >
            <Send fontSize="large" />
          </IconButton>
        </Box>

        {/* Save */}
        <Box textAlign="center">
          <IconButton onClick={handleSave} sx={{ color: "#fff" }}>
            {saved ? (
              <Bookmark fontSize="large" />
            ) : (
              <BookmarkBorder fontSize="large" />
            )}
          </IconButton>
        </Box>

        {/* Add to story */}
        <IconButton onClick={handleAddToStory} sx={{ color: "#fff" }}>
          <AddCircleOutline fontSize="large" />
        </IconButton>

        <IconButton onClick={toggleMute} sx={{ color: "#fff" }}>
          {muted ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
      </Stack>

      {/* Bottom info */}
      <Box
        sx={{
          position: "absolute",
          left: 12,
          bottom: 40,
          right: 80,
          color: "#fff",
          zIndex: 20,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} mb={1.2}>
          <Avatar
            src={
              reel.user?.avatar?.startsWith("http")
                ? reel.user.avatar
                : reel.user?.avatar
                ? `http://localhost:5000${reel.user.avatar}`
                : undefined
            }
            component={Link}
            to={`/${reel.user?.username}`}
            sx={{ width: 36, height: 36, border: "2px solid #fff" }}
          >
            {reel.user?.username?.[0]?.toUpperCase()}
          </Avatar>
          <Typography
            component={Link}
            to={`/${reel.user?.username}`}
            fontWeight={700}
            fontSize={14}
            sx={{ textDecoration: "none", color: "#fff" }}
          >
            {reel.user?.username}
          </Typography>
          <Typography
            component="span"
            sx={{
              border: "1px solid #fff",
              borderRadius: 1,
              px: 1,
              py: 0.2,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Follow
          </Typography>
        </Box>

        {reel.caption && (
          <Typography variant="body2" sx={{ mb: 1, fontSize: 14 }}>
            {reel.caption.length > 90
              ? reel.caption.slice(0, 90) + "..."
              : reel.caption}
          </Typography>
        )}

        <Box display="flex" alignItems="center" gap={0.7}>
          <MusicNote sx={{ fontSize: 15 }} />
          <Typography variant="caption" fontSize={12}>
            Original audio · {reel.user?.username}
          </Typography>
        </Box>
      </Box>

      <CommentsDrawer
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={reel._id}
        comments={comments}
        onCommentAdded={(newComments) => {
          setComments(newComments);
          setCommentsCount(newComments.length);
        }}
      />

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        postId={reel._id}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success">{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default ReelPlayer;