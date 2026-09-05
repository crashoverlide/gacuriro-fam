import React from "react";
import { Box, IconButton, Avatar, Badge } from "@mui/material";
import {
  Home,
  HomeOutlined,
  Search,
  Movie,
  MovieOutlined,
  AddBoxOutlined,
  FavoriteBorder,
  Favorite,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  const items = [
    {
      path: "/",
      icon: isActive("/") ? <Home /> : <HomeOutlined />,
      label: "Home",
    },
    {
      path: "/explore",
      icon: <Search />,
      label: "Search",
    },
    {
      path: "/reels",
      icon: isActive("/reels") ? <Movie /> : <MovieOutlined />,
      label: "Reels",
    },
    {
      path: "/create",
      icon: <AddBoxOutlined />,
      label: "Create",
    },
    {
      path: "/notifications",
      icon: isActive("/notifications") ? <Favorite /> : <FavoriteBorder />,
      label: "Activity",
    },
  ];

  return (
    <Box
      sx={{
        display: { xs: "flex", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: 1200,
        justifyContent: "space-around",
        alignItems: "center",
        px: 1,
      }}
    >
      {items.map((item) => (
        <IconButton
          key={item.path}
          onClick={() => navigate(item.path)}
          sx={{
            color: isActive(item.path) ? "text.primary" : "text.secondary",
          }}
        >
          {item.icon}
        </IconButton>
      ))}

      {/* Profile */}
      <IconButton onClick={() => navigate(`/${user?.username}`)}>
        <Avatar
          src={user?.avatar}
          sx={{
            width: 28,
            height: 28,
            border: isActive(`/${user?.username}`)
              ? "2px solid"
              : "2px solid transparent",
            borderColor: "text.primary",
          }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </Avatar>
      </IconButton>
    </Box>
  );
}

export default BottomNav;