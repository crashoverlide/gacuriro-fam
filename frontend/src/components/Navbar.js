import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
} from "@mui/material";
import {
  FavoriteBorder,
  ChatBubbleOutline,
  AddBoxOutlined,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        display: { xs: "flex", md: "none" },
        bgcolor: "background.paper",
        color: "text.primary",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            background: "linear-gradient(135deg, #6C4DF6, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Socially
        </Typography>

        <Box display="flex" alignItems="center" gap={0.5}>
          <IconButton onClick={() => navigate("/create")}>
            <AddBoxOutlined />
          </IconButton>
          <IconButton onClick={() => navigate("/notifications")}>
            <FavoriteBorder />
          </IconButton>
          <IconButton onClick={() => navigate("/messages")}>
            <ChatBubbleOutline />
          </IconButton>
          <IconButton component={Link} to={`/${user?.username}`}>
            <Avatar src={user?.avatar} sx={{ width: 28, height: 28 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;