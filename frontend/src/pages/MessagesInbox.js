import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Badge,
} from "@mui/material";
import { Search, Edit, ArrowBack } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function MessagesInbox() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        setConversations(data.conversations || []);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const filtered = conversations.filter((c) => {
    if (!q.trim()) return true;
    const name = (
      c.otherUser?.username ||
      c.group_name ||
      c.title ||
      ""
    ).toLowerCase();
    return name.includes(q.trim().toLowerCase());
  });

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
        justifyContent="space-between"
        px={2}
        py={1.5}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: "#fff" }}>
            <ArrowBack />
          </IconButton>
          <Typography fontWeight={800} fontSize={20}>
            {user?.username || "Messages"}
          </Typography>
        </Box>
        <IconButton sx={{ color: "#fff" }}>
          <Edit />
        </IconButton>
      </Box>

      <Box px={2} pb={1.5}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: "#888" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 5,
              bgcolor: "#1a1a1a",
              color: "#fff",
              "& fieldset": { border: "none" },
            },
          }}
        />
      </Box>

      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        pb={1}
      >
        <Typography fontWeight={700}>Messages</Typography>
        <Typography fontSize={13} sx={{ color: "#0095f6" }}>
          Requests
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} sx={{ color: "#ff2d8a" }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography color="#666" textAlign="center" py={4}>
          No messages yet
        </Typography>
      ) : (
        <List disablePadding>
          {filtered.map((c) => {
            const id = c.id || c._id;
            const name =
              c.otherUser?.username || c.group_name || c.title || "Chat";
            const preview = c.last_message || "Start chatting";
            const avatar = c.otherUser?.avatar || c.avatar;

            return (
              <ListItem
                key={id}
                button
                component={Link}
                to={`/messages/${id}`}
                sx={{ px: 2, py: 1.25, "&:hover": { bgcolor: "#111" } }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    variant="dot"
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    sx={{
                      "& .MuiBadge-badge": {
                        bgcolor: "#22c55e",
                        boxShadow: "0 0 0 2px #000",
                      },
                    }}
                  >
                    <Avatar
                      src={mediaSrc(avatar)}
                      sx={{ width: 56, height: 56, bgcolor: "#333" }}
                    >
                      {String(name)[0]?.toUpperCase()}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography fontWeight={600} fontSize={14} noWrap>
                      {name}
                    </Typography>
                  }
                  secondary={
                    <Typography fontSize={13} color="#888" noWrap>
                      {preview}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}

export default MessagesInbox;