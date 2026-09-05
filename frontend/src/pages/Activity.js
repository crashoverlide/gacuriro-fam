import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Activity() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Uses notifications as activity feed for likes/comments/follows
        const res = await fetch(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setItems(data.notifications || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const filtered = items.filter((n) => {
    if (tab === 0) return n.type === "like";
    if (tab === 1) return n.type === "comment";
    if (tab === 2) return n.type === "follow" || n.type === "follow_request";
    return true;
  });

  return (
    <Box minHeight="100vh">
      <Box display="flex" alignItems="center" gap={1} p={2} borderBottom="1px solid" borderColor="divider">
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700} fontSize={18}>
          Your activity
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable">
        <Tab label="Likes" />
        <Tab label="Comments" />
        <Tab label="Follows" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <List>
          {filtered.map((n) => (
            <ListItem key={n._id} button onClick={() => navigate(`/${n.sender?.username}`)}>
              <ListItemAvatar>
                <Avatar
                  src={
                    n.sender?.avatar
                      ? n.sender.avatar.startsWith("http")
                        ? n.sender.avatar
                        : `${API_URL}${n.sender.avatar}`
                      : undefined
                  }
                />
              </ListItemAvatar>
              <ListItemText
                primary={`${n.sender?.username} · ${n.type}`}
                secondary={n.comment || new Date(n.createdAt).toLocaleString()}
              />
            </ListItem>
          ))}
          {!filtered.length && (
            <Typography textAlign="center" color="text.secondary" py={6}>
              No activity yet
            </Typography>
          )}
        </List>
      )}
    </Box>
  );
}

export default Activity;