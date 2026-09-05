import React from "react";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import {
  Home as HomeIcon,
  Search,
  AddBox,
  Movie,
  Person,
} from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const path = location.pathname;
  let value = 0;
  if (path.startsWith("/explore") || path.startsWith("/search")) value = 1;
  else if (path.startsWith("/reels")) value = 2;
  else if (path.startsWith("/create")) value = 3;
  else if (
    user?.username &&
    (path === `/${user.username}` || path.startsWith(`/${user.username}/`))
  ) {
    value = 4;
  } else if (path === "/" || path === "/home") value = 0;

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: "block", md: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        borderTop: "1px solid",
        borderColor: "divider",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        value={value}
        showLabels={false}
        sx={{ height: 56 }}
        onChange={(e, v) => {
          if (v === 0) navigate("/");
          if (v === 1) navigate("/explore");
          if (v === 2) navigate("/reels");
          if (v === 3) navigate("/create");
          if (v === 4) navigate(user?.username ? `/${user.username}` : "/");
        }}
      >
        <BottomNavigationAction icon={<HomeIcon />} aria-label="Home" />
        <BottomNavigationAction icon={<Search />} aria-label="Search" />
        <BottomNavigationAction icon={<Movie />} aria-label="Reels" />
        <BottomNavigationAction icon={<AddBox />} aria-label="Create" />
        <BottomNavigationAction icon={<Person />} aria-label="Profile" />
      </BottomNavigation>
    </Paper>
  );
}

export default BottomNav;