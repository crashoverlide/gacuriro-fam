import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { Favorite, ChatBubble } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { API_URL } from "../config";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function GridItem({ post }) {
  const [hover, setHover] = useState(false);
  const postId = post.id || post._id;
  const src = mediaSrc(post.mediaUrl || post.media_url || "");
  const isVideo =
    post.isReel ||
    post.is_reel ||
    post.mediaType === "video" ||
    post.media_type === "video";
  const likes = post.likesCount ?? post.likes_count ?? 0;
  const comments = post.commentsCount ?? post.comments_count ?? 0;

  if (!postId) return null;

  return (
    <Box
      component={Link}
      to={`/post/${postId}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={() => setHover(true)}
      onTouchEnd={() => setTimeout(() => setHover(false), 800)}
      sx={{
        position: "relative",
        aspectRatio: "1 / 1",
        overflow: "hidden",
        bgcolor: "#111",
        display: "block",
        textDecoration: "none",
      }}
    >
      {isVideo ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          bgcolor: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          opacity: hover ? 1 : 0,
          transition: "opacity 0.15s ease",
          pointerEvents: "none",
        }}
      >
        <Box display="flex" alignItems="center" gap={0.5} color="#fff">
          <Favorite sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={14}>
            {likes}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5} color="#fff">
          <ChatBubble sx={{ fontSize: 20 }} />
          <Typography fontWeight={700} fontSize={14}>
            {comments}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default function ProfileGrid({ posts = [] }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0.25,
      }}
    >
      {posts.map((p) => {
        const key = p.id || p._id;
        if (!key) return null;
        return <GridItem key={key} post={p} />;
      })}
    </Box>
  );
}