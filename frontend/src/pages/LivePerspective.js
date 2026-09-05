import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { ArrowBack, Add, Videocam } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function LivePerspective() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setSessions(data.sessions || []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/live`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed");
      setOpen(false);
      navigate(`/live/${data.session.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", minHeight: "100vh", pb: 10 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800} flex={1}>
          Live Perspective
        </Typography>
        <IconButton color="primary" onClick={() => setOpen(true)}>
          <Add />
        </IconButton>
      </Box>

      <Box px={2} py={1.5}>
        <Typography fontSize={13} color="text.secondary">
          One event · many cameras. Viewers switch angles. After live, save
          moments into a Fam Link.
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : sessions.length === 0 ? (
        <Box textAlign="center" py={6} px={3}>
          <Videocam sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography fontWeight={700} mb={1}>
            No live sessions
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Go Live
          </Button>
        </Box>
      ) : (
        <List>
          {sessions.map((s) => (
            <ListItem
              key={s.id}
              button
              component={Link}
              to={`/live/${s.id}`}
              sx={{ borderBottom: "1px solid", borderColor: "divider" }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "#ff2d8a" }}>
                  <Videocam />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography fontWeight={700}>
                    {s.title}{" "}
                    <Typography component="span" color="error" fontSize={12}>
                      ● LIVE
                    </Typography>
                  </Typography>
                }
                secondary={
                  s.host ? `Host @${s.host.username}` : "Live Perspective"
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Start Live Perspective</DialogTitle>
        <DialogContent>
          {error && (
            <Typography color="error" fontSize={13} mb={1}>
              {error}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Event title"
            placeholder="Kigali Concert 2026"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={create}
            disabled={!title.trim() || creating}
            sx={{ bgcolor: "#ff2d8a" }}
          >
            {creating ? "Starting…" : "Go Live"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default LivePerspective;