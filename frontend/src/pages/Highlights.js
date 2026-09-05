import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Highlights() {
  const { userId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const id = userId || user?._id;

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API_URL}/api/stories/highlights/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setHighlights(data.highlights || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      await fetch(`${API_URL}/api/stories/highlights`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: title.trim(), storyIds: [] }),
      });
      setOpen(false);
      setTitle("");
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box minHeight="100vh">
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={2}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700}>Highlights</Typography>
        <Box flex={1} />
        <Button onClick={() => setOpen(true)}>New</Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" gap={2} p={2} flexWrap="wrap">
          {highlights.map((h) => (
            <Box key={h._id} textAlign="center" width={80}>
              <Avatar
                src={
                  h.cover
                    ? h.cover.startsWith("http")
                      ? h.cover
                      : `${API_URL}${h.cover}`
                    : undefined
                }
                sx={{ width: 70, height: 70, mx: "auto", border: "2px solid #555" }}
              />
              <Typography variant="caption" noWrap display="block" mt={0.5}>
                {h.title}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Highlight</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Highlight Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={creating || !title.trim()}>
            Next
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Highlights;