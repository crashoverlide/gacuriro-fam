import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import { ArrowBack, Add, Event } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function FamLink() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fam-links`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setLinks(data.links || []);
    } catch (e) {
      console.error(e);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const createLink = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/fam-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description,
          location,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to create");
      setOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      if (data.link?.id) navigate(`/fam/${data.link.id}`);
      else load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", pb: 10, minHeight: "100vh" }}>
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
          Fam Links
        </Typography>
        <IconButton color="primary" onClick={() => setOpen(true)}>
          <Add />
        </IconButton>
      </Box>

      <Box px={2} py={2}>
        <Typography color="text.secondary" fontSize={14}>
          Shared real-life timelines. Create a link for a concert, match, or
          hangout — friends add photos, videos, and voice notes by time.
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : links.length === 0 ? (
        <Box textAlign="center" py={6} px={3}>
          <Event sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
          <Typography fontWeight={700} mb={1}>
            No Fam Links yet
          </Typography>
          <Typography color="text.secondary" fontSize={14} mb={2}>
            Start one for your next moment together.
          </Typography>
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create Fam Link
          </Button>
        </Box>
      ) : (
        <List>
          {links.map((link) => (
            <ListItem
              key={link.id}
              button
              component={Link}
              to={`/fam/${link.id}`}
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                py: 1.5,
              }}
            >
              <ListItemText
                primary={
                  <Typography fontWeight={700}>{link.title}</Typography>
                }
                secondary={
                  [link.location, link.description]
                    .filter(Boolean)
                    .join(" · ") || "Open timeline"
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Fam Link</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {error && (
              <Typography color="error" fontSize={13}>
                {error}
              </Typography>
            )}
            <TextField
              label="Title"
              placeholder="Kigali Concert 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Location"
              placeholder="Amahoro Stadium"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createLink}
            disabled={!title.trim() || creating}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FamLink;