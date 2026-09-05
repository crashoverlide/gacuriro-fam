import React from "react";
import { Box, IconButton, Typography, Badge } from "@mui/material";
import {
  CameraAltOutlined,
  FavoriteBorder,
  ChatBubbleOutline,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function MobileHeader() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        justifyContent="space-between",
        px: 1.5,
        py: 1,
        position: "sticky",
        top: 0,
        zIndex: 1100,
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
        height: 54,
      }}
    >
      {/* Camera */}
      <IconButton onClick={() => navigate("/create")} size="small">
        <CameraAltOutlined />
      </IconButton>

      {/* Logo */}
      <Typography
        fontWeight={800}
        fontSize={22}
        sx={{
          background: "linear-gradient(135deg, #f58529, #dd2a7b, #8134af)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: -0.5,
        }}
      >
        Socially
      </Typography>

      {/* Right icons */}
      <Box display="flex" alignItems="center" gap={0.5}>
        <IconButton onClick={() => navigate("/notifications")} size="small">
          <Badge color="error" variant="dot">
            <FavoriteBorder />
          </Badge>
        </IconButton>
        <IconButton onClick={() => navigate("/messages")} size="small">
          <Badge badgeContent={2} color="error">
            <ChatBubbleOutline />
          </Badge>
        </IconButton>
      </Box>
    </Box>
  );
}

export default MobileHeader;