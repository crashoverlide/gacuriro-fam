import React from "react";
import { Box, IconButton, Badge } from "@mui/material";
import {
  Home,
  Search,
  AddBox,
  Movie,
  Person,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const username = user?.username || user?.userName || "";
  const profilePath = username ? `/${username}` : "/login";

  const items = [
    { key: "home", path: "/", icon: <Home />, match: (p) => p === "/" },
    {
      key: "search",
      path: "/explore",
      icon: <Search />,
      match: (p) => p.startsWith("/explore") || p.startsWith("/search"),
    },
    {
      key: "reels",
      path: "/reels",
      icon: <Movie />,
      match: (p) => p.startsWith("/reels"),
    },
    {
      key: "create",
      path: "/create",
      icon: <AddBox />,
      match: (p) => p.startsWith("/create"),
    },
    {
      key: "profile",
      path: profilePath,
      icon: <Person />,
      match: (p) => username && (p === `/${username}` || p === profilePath),
    },
  ];

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 56,
        bgcolor: "#fff",
        borderTop: "1px solid #eee",
        display: { xs: "flex", md: "none" },
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 1200,
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((it) => {
        const active = it.match(location.pathname);
        return (
          <IconButton
            key={it.key}
            onClick={() => navigate(it.path)}
            sx={{ color: active ? "#111" : "#8e8e8e" }}
          >
            {it.icon}
          </IconButton>
        );
      })}
    </Box>
  );
}

export default BottomNav;