import React from "react";
import { Box, IconButton, Typography, Badge } from "@mui/material";
import { CameraAltOutlined, FavoriteBorder, ChatBubbleOutline } from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  if (
    location.pathname.startsWith("/messages") ||
    location.pathname.startsWith("/reels") ||
    location.pathname.startsWith("/create")
  ) {
    return null;
  }

  return (
    <Box
      sx={{
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        justifyContent: "space-between",
        px: 1.5,
        height: 54,
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <IconButton onClick={() => navigate("/create")}>
        <CameraAltOutlined />
      </IconButton>

      <Typography
        fontWeight={800}
        fontSize={18}
        sx={{
          background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Gacuriro Fam
      </Typography>

      <Box>
        <IconButton onClick={() => navigate("/notifications")}>
          <Badge color="error" variant="dot">
            <FavoriteBorder />
          </Badge>
        </IconButton>
        <IconButton onClick={() => navigate("/messages")}>
          <ChatBubbleOutline />
        </IconButton>
      </Box>
    </Box>
  );
}