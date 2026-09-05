import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  IconButton,
  TextField,
  Button,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Following() {
  const { username } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${API_URL}/api/users/${encodeURIComponent(username)}/following`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to load");
        setUsers(data.users || []);
      } catch (e) {
        setError(e.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    if (username && token) load();
  }, [username, token]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.username?.toLowerCase().includes(q) ||
      u.fullName?.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", minHeight: "100vh", pb: 10 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography fontWeight={700}>{username}</Typography>
          <Typography variant="caption" color="text.secondary">
            Following
          </Typography>
        </Box>
      </Box>

      <Box px={2} py={1.5}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      ) : error ? (
        <Typography color="error" textAlign="center" py={3}>
          {error}
        </Typography>
      ) : filtered.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={3}>
          No users found
        </Typography>
      ) : (
        <List>
          {filtered.map((u) => (
            <ListItem
              key={u._id || u.id}
              secondaryAction={
                <Button
                  size="small"
                  component={Link}
                  to={`/${u.username}`}
                  variant="outlined"
                >
                  View
                </Button>
              }
            >
              <ListItemAvatar>
                <Avatar
                  src={
                    u.avatar
                      ? u.avatar.startsWith("http")
                        ? u.avatar
                        : `${API_URL}${u.avatar}`
                      : undefined
                  }
                  component={Link}
                  to={`/${u.username}`}
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Link
                    to={`/${u.username}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    {u.username}
                  </Link>
                }
                secondary={u.fullName || ""}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

export default Following;