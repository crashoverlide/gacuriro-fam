import React, { useRef, useState, useEffect } from "react";
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Stack,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Send,
  VolumeOff,
  VolumeUp,
  MusicNote,
} from "@mui/icons-material";
import { Link } from "react-router-dom";

function ReelPlayer({ reel, isActive }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(reel.isLiked || false);
  const [likesCount, setLikesCount] = useState(reel.likesCount || 0);

  const videoUrl =
    reel.media?.[0]?.url ||
    reel.video ||
    "";
  const fullUrl = videoUrl.startsWith("http")
    ? videoUrl
    : `http://localhost:5000${videoUrl}`;

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isActive]);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
  };

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Vertical video - Reels style */}
      <video
        ref={videoRef}
        src={fullUrl}
        loop
        muted={muted}
        playsInline
        autoPlay={isActive}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover", // important for Reels look
        }}
      />

      {/* Right side actions */}
      <Stack
        spacing={2.5}
        sx={{
          position: "absolute",
          right: 12,
          bottom: 120,
          alignItems: "center",
          zIndex: 10,
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
          <Typography variant="caption" color="#fff" fontWeight={600}>
            {likesCount}
          </Typography>
        </Box>

        <Box textAlign="center">
          <IconButton sx={{ color: "#fff" }}>
            <ChatBubbleOutline fontSize="large" />
          </IconButton>
          <Typography variant="caption" color="#fff">
            {reel.commentsCount || 0}
          </Typography>
        </Box>

        <IconButton sx={{ color: "#fff" }}>
          <Send fontSize="large" />
        </IconButton>

        <IconButton sx={{ color: "#fff" }} onClick={toggleMute}>
          {muted ? <VolumeOff /> : <VolumeUp />}
        </IconButton>
      </Stack>

      {/* Bottom info */}
      <Box
        sx={{
          position: "absolute",
          left: 12,
          bottom: 30,
          right: 80,
          color: "#fff",
          zIndex: 10,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5} mb={1}>
          <Avatar
            src={reel.user?.avatar}
            component={Link}
            to={`/${reel.user?.username}`}
            sx={{ width: 36, height: 36, border: "1px solid #fff" }}
          />
          <Typography
            component={Link}
            to={`/${reel.user?.username}`}
            fontWeight={700}
            sx={{ textDecoration: "none", color: "#fff" }}
          >
            {reel.user?.username}
          </Typography>
        </Box>

        {reel.caption && (
          <Typography variant="body2" sx={{ opacity: 0.95, mb: 1 }}>
            {reel.caption}
          </Typography>
        )}

        <Box display="flex" alignItems="center" gap={0.5}>
          <MusicNote sx={{ fontSize: 16 }} />
          <Typography variant="caption">Original audio</Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default ReelPlayer;