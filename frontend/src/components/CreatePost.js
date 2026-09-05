import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemText,
  InputAdornment,
} from "@mui/material";
import {
  Close,
  ArrowBack,
  LocationOn,
  MusicNote,
  Image as ImageIcon,
  Delete,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

// Simple mock music list (replace with real API later)
const MOCK_MUSIC = [
  { id: 1, title: "Original Audio", artist: "You" },
  { id: 2, title: "Blinding Lights", artist: "The Weeknd" },
  { id: 3, title: "Levitating", artist: "Dua Lipa" },
  { id: 4, title: "Save Your Tears", artist: "The Weeknd" },
  { id: 5, title: "Stay", artist: "The Kid LAROI & Justin Bieber" },
  { id: 6, title: "Good 4 U", artist: "Olivia Rodrigo" },
  { id: 7, title: "Industry Baby", artist: "Lil Nas X" },
  { id: 8, title: "Peaches", artist: "Justin Bieber" },
];

function Create() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);          // File objects
  const [previews, setPreviews] = useState([]);    // Object URLs
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [selectedMusic, setSelectedMusic] = useState(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicSearch, setMusicSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = select media, 2 = details

  // ========== Handle multiple images ==========
  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    // Limit to 10 images
    const limited = selected.slice(0, 10);
    setFiles((prev) => [...prev, ...limited].slice(0, 10));

    const newPreviews = limited.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));

    if (step === 1) setStep(2);
  };

  const removeImage = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ========== Submit post ==========
  const handleSubmit = async () => {
    if (files.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("media", file)); // backend expects "media"
      formData.append("caption", caption);
      if (location) formData.append("location", location);
      if (selectedMusic) {
        formData.append("musicTitle", selectedMusic.title);
        formData.append("musicArtist", selectedMusic.artist);
      }

      const res = await fetch(`${API_URL}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        navigate("/");
      } else {
        alert(data.message || "Failed to create post");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const filteredMusic = MOCK_MUSIC.filter(
    (m) =>
      m.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
      m.artist.toLowerCase().includes(musicSearch.toLowerCase())
  );

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={1.5}
        borderBottom="1px solid"
        borderColor="divider"
        position="sticky"
        top={0}
        bgcolor="background.paper"
        zIndex={10}
      >
        <IconButton onClick={() => (step === 2 ? setStep(1) : navigate(-1))}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700}>
          {step === 1 ? "New post" : "Create post"}
        </Typography>
        <Button
          disabled={files.length === 0 || loading}
          onClick={step === 1 ? () => setStep(2) : handleSubmit}
          sx={{ fontWeight: 700, color: "primary.main" }}
        >
          {loading ? <CircularProgress size={20} /> : step === 1 ? "Next" : "Share"}
        </Button>
      </Box>

      {/* ========== STEP 1: Select media ========== */}
      {step === 1 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="70vh"
          gap={2}
          p={3}
        >
          <ImageIcon sx={{ fontSize: 80, color: "text.secondary" }} />
          <Typography variant="h6" fontWeight={600}>
            Drag photos and videos here
          </Typography>
          <Button
            variant="contained"
            onClick={() => fileInputRef.current?.click()}
            sx={{ borderRadius: 2, px: 4 }}
          >
            Select from computer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleFileChange}
          />
        </Box>
      )}

      {/* ========== STEP 2: Caption + Location + Music ========== */}
      {step === 2 && (
        <Box p={2}>
          {/* Image previews (horizontal scroll) */}
          <Box
            display="flex"
            gap={1}
            overflow="auto"
            mb={2}
            sx={{ "&::-webkit-scrollbar": { height: 6 } }}
          >
            {previews.map((src, i) => (
              <Box key={i} position="relative" flexShrink={0}>
                <Box
                  component="img"
                  src={src}
                  sx={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeImage(i)}
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                  }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            ))}
            {/* Add more */}
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                width: 120,
                height: 120,
                borderRadius: 2,
                border: "2px dashed",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ImageIcon color="disabled" />
            </Box>
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={handleFileChange}
          />

          {/* User + Caption */}
          <Box display="flex" gap={1.5} mb={2}>
            <Avatar src={user?.avatar} sx={{ width: 40, height: 40 }}>
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="Write a caption... (use @ and #)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              variant="standard"
              InputProps={{ disableUnderline: true }}
            />
          </Box>

          {/* Location */}
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            py={1.5}
            borderTop="1px solid"
            borderColor="divider"
          >
            <LocationOn color="action" />
            <TextField
              fullWidth
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              variant="standard"
              InputProps={{ disableUnderline: true }}
            />
          </Box>

          {/* Music */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            py={1.5}
            borderTop="1px solid"
            borderColor="divider"
            sx={{ cursor: "pointer" }}
            onClick={() => setMusicOpen(true)}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <MusicNote color="action" />
              <Typography>
                {selectedMusic
                  ? `${selectedMusic.title} • ${selectedMusic.artist}`
                  : "Add music"}
              </Typography>
            </Box>
            {selectedMusic && (
              <Chip
                label="Remove"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMusic(null);
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Music picker dialog */}
      <Dialog
        open={musicOpen}
        onClose={() => setMusicOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add music</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Search music"
            value={musicSearch}
            onChange={(e) => setMusicSearch(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <MusicNote fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <List dense>
            {filteredMusic.map((m) => (
              <ListItemButton
                key={m.id}
                onClick={() => {
                  setSelectedMusic(m);
                  setMusicOpen(false);
                }}
              >
                <ListItemText
                  primary={m.title}
                  secondary={m.artist}
                />
              </ListItemButton>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMusicOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Create;