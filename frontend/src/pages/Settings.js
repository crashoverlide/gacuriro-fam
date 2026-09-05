import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  ArrowBack,
  Lock,
  Security,
  Notifications as NotifIcon,
  DarkMode,
  Logout,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Settings() {
  const { user, token, logout, login } = useAuth();
  const navigate = useNavigate();

  const [isPrivate, setIsPrivate] = useState(Boolean(user?.isPrivate));
  const [twoFA, setTwoFA] = useState(Boolean(user?.twoFactorEnabled));
  const [dark, setDark] = useState(
    () => localStorage.getItem("gf_theme") === "dark"
  );
  const [notifPref, setNotifPref] = useState(
    () => localStorage.getItem("gf_notif") !== "off"
  );
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setIsPrivate(Boolean(user?.isPrivate));
    setTwoFA(Boolean(user?.twoFactorEnabled));
  }, [user]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const togglePrivate = async () => {
    const next = !isPrivate;
    setIsPrivate(next);
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users/private`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ isPrivate: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update privacy");
      setMsg(next ? "Account is now private" : "Account is now public");
      if (data.user && login) {
        // optional: refresh local user if your AuthContext supports it
      }
    } catch (e) {
      setIsPrivate(!next);
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle2FA = async () => {
    const next = !twoFA;
    setTwoFA(next);
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users/2fa`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not update 2FA");
      setMsg(next ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
    } catch (e) {
      setTwoFA(!next);
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("gf_theme", next ? "dark" : "light");
    document.body.style.background = next ? "#000" : "#fafafa";
    document.body.style.color = next ? "#fff" : "#111";
    setMsg(next ? "Dark mode on" : "Light mode on");
  };

  const toggleNotifPref = () => {
    const next = !notifPref;
    setNotifPref(next);
    localStorage.setItem("gf_notif", next ? "on" : "off");
    setMsg(next ? "Notifications preference on" : "Notifications preference off");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "#000",
        color: "#fff",
        pb: 10,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1.5}
        borderBottom="1px solid #222"
      >
        <IconButton onClick={() => navigate(-1)} sx={{ color: "#fff" }}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700}>Settings</Typography>
        {busy && <CircularProgress size={18} sx={{ ml: "auto", color: "#ff2d8a" }} />}
      </Box>

      <Box px={2} pt={2}>
        {msg && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>
            {msg}
          </Alert>
        )}
        {err && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>
            {err}
          </Alert>
        )}
      </Box>

      <Typography
        variant="caption"
        sx={{ px: 2, color: "#888", letterSpacing: 1 }}
      >
        PRIVACY & SECURITY
      </Typography>
      <List>
        <ListItem>
          <ListItemIcon sx={{ color: "#fff" }}>
            <Lock />
          </ListItemIcon>
          <ListItemText
            primary="Private account"
            secondary="Only approved followers can see your posts"
            secondaryTypographyProps={{ color: "#888" }}
          />
          <ListItemSecondaryAction>
            <Switch
              edge="end"
              checked={isPrivate}
              onChange={togglePrivate}
              disabled={busy || !token}
              color="secondary"
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: "#fff" }}>
            <Security />
          </ListItemIcon>
          <ListItemText
            primary="Two-factor authentication"
            secondary="Extra protection for your login"
            secondaryTypographyProps={{ color: "#888" }}
          />
          <ListItemSecondaryAction>
            <Switch
              edge="end"
              checked={twoFA}
              onChange={toggle2FA}
              disabled={busy || !token}
              color="secondary"
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>

      <Divider sx={{ borderColor: "#222", my: 1 }} />

      <Typography
        variant="caption"
        sx={{ px: 2, color: "#888", letterSpacing: 1 }}
      >
        PREFERENCES
      </Typography>
      <List>
        <ListItem
          button
          onClick={() => navigate("/notifications")}
        >
          <ListItemIcon sx={{ color: "#fff" }}>
            <NotifIcon />
          </ListItemIcon>
          <ListItemText primary="Notifications" />
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: "#fff" }}>
            <NotifIcon />
          </ListItemIcon>
          <ListItemText
            primary="Push preference"
            secondary="Store local notification preference"
            secondaryTypographyProps={{ color: "#888" }}
          />
          <ListItemSecondaryAction>
            <Switch
              edge="end"
              checked={notifPref}
              onChange={toggleNotifPref}
              color="secondary"
            />
          </ListItemSecondaryAction>
        </ListItem>

        <ListItem>
          <ListItemIcon sx={{ color: "#fff" }}>
            <DarkMode />
          </ListItemIcon>
          <ListItemText
            primary="Appearance"
            secondary={dark ? "Dark mode" : "Light mode"}
            secondaryTypographyProps={{ color: "#888" }}
          />
          <ListItemSecondaryAction>
            <Switch
              edge="end"
              checked={dark}
              onChange={toggleDark}
              color="secondary"
            />
          </ListItemSecondaryAction>
        </ListItem>
      </List>

      <Divider sx={{ borderColor: "#222", my: 1 }} />

      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon sx={{ color: "#ff2d8a" }}>
            <Logout />
          </ListItemIcon>
          <ListItemText
            primary="Log out"
            primaryTypographyProps={{ color: "#ff2d8a", fontWeight: 600 }}
          />
        </ListItem>
      </List>
    </Box>
  );
}

export default Settings;