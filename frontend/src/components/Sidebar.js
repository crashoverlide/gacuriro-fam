import React, { useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from "@mui/material";
import {
  Home,
  Search,
  Movie,
  ChatBubbleOutline,
  FavoriteBorder,
  AddBox,
  Person,
  Menu as MenuIcon,
  Settings,
  History,
  BookmarkBorder,
  CalendarMonth,
  ReportProblem,
  Logout,
  Dashboard,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { label: "Home", icon: <Home />, path: "/" },
  { label: "Search", icon: <Search />, path: "/explore" },
  { label: "Reels", icon: <Movie />, path: "/reels" },
  { label: "Messages", icon: <ChatBubbleOutline />, path: "/messages" },
  { label: "Notifications", icon: <FavoriteBorder />, path: "/notifications" },
  { label: "Create", icon: <AddBox />, path: "/create" },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");

  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        width: 244,
        borderRight: "1px solid",
        borderColor: "divider",
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        py: 2,
        px: 1,
        zIndex: 1000,
        bgcolor: "background.paper",
      }}
    >
      <Typography
        fontWeight={900}
        fontSize={22}
        px={2}
        mb={3}
        sx={{
          background: "linear-gradient(135deg,#ff4d9e,#c026ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Gacuriro Fam
      </Typography>

      <List>
        {links.map((l) => (
          <ListItemButton
            key={l.path}
            selected={location.pathname === l.path}
            onClick={() => navigate(l.path)}
            sx={{ borderRadius: 3, mb: 0.5 }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{l.icon}</ListItemIcon>
            <ListItemText primary={l.label} />
          </ListItemButton>
        ))}
        <ListItemButton
          selected={location.pathname === `/${user?.username}`}
          onClick={() => navigate(`/${user?.username}`)}
          sx={{ borderRadius: 3, mb: 0.5 }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
            <Person />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </ListItemButton>
      </List>

      <Box flex={1} />

      <ListItemButton onClick={(e) => setAnchor(e.currentTarget)} sx={{ borderRadius: 3 }}>
        <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
          <MenuIcon />
        </ListItemIcon>
        <ListItemText primary="More" />
      </ListItemButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        PaperProps={{ sx: { width: 260, borderRadius: 3 } }}
      >
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/settings");
          }}
        >
          <Settings fontSize="small" sx={{ mr: 1.5 }} /> Settings
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/activity");
          }}
        >
          <History fontSize="small" sx={{ mr: 1.5 }} /> Your activity
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/archive");
          }}
        >
          <BookmarkBorder fontSize="small" sx={{ mr: 1.5 }} /> Archive
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/scheduled");
          }}
        >
          <CalendarMonth fontSize="small" sx={{ mr: 1.5 }} /> Scheduled content
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate("/dashboard");
          }}
        >
          <Dashboard fontSize="small" sx={{ mr: 1.5 }} /> Professional dashboard
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setReportOpen(true);
          }}
        >
          <ReportProblem fontSize="small" sx={{ mr: 1.5 }} /> Report a problem
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout();
            navigate("/login");
          }}
        >
          <Logout fontSize="small" sx={{ mr: 1.5 }} /> Log out
        </MenuItem>
      </Menu>

      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullWidth>
        <DialogTitle>Report a problem</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Describe the problem..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setReportOpen(false);
              setReportText("");
              alert("Thanks — report submitted.");
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Sidebar;