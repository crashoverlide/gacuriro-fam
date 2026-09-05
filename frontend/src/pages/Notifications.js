import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Button,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import { ArrowBack, MoreHoriz } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { mediaUrl } from "../utils/api";
import { formatDistanceToNow } from "date-fns";

function Notifications() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  // userId -> none | following | requested | loading
  const [followState, setFollowState] = useState({});
  const [menu, setMenu] = useState({ anchor: null, user: null });

  const load = useCallback(async () => {
    try {
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
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/notifications/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [token]);

  const followUser = async (sender) => {
    if (!sender?._id) return;
    const id = sender._id;
    setFollowState((p) => ({ ...p, [id]: "loading" }));
    try {
      const res = await fetch(`${API_URL}/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFollowState((p) => ({
          ...p,
          [id]: data.following ? "following" : data.requested ? "requested" : "none",
        }));
      } else {
        setFollowState((p) => ({ ...p, [id]: "none" }));
        alert(data.message || "Follow failed");
      }
    } catch {
      setFollowState((p) => ({ ...p, [id]: "none" }));
    }
  };

  const unfollowUser = async (u) => {
    if (!u?._id) return;
    setMenu({ anchor: null, user: null });
    try {
      await fetch(`${API_URL}/api/users/${u._id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setFollowState((p) => ({ ...p, [u._id]: "none" }));
    } catch (e) {
      console.error(e);
    }
  };

  const muteShared = async (u) => {
    setMenu({ anchor: null, user: null });
    try {
      await fetch(`${API_URL}/api/users/${u._id}/mute`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(`Muted shared activity from ${u.username}`);
    } catch {
      const key = "mutedShared";
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      if (!list.includes(u._id)) {
        list.push(u._id);
        localStorage.setItem(key, JSON.stringify(list));
      }
      alert(`Muted shared activity from ${u.username}`);
    }
  };

  const messageUser = async (u) => {
    setMenu({ anchor: null, user: null });
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: u._id }),
      });
      const data = await res.json();
      if (res.ok && data.conversation?._id) {
        navigate(`/messages/${data.conversation._id}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter((n) => {
    if (tab === 1) return n.type === "follow" || n.type === "follow_request";
    if (tab === 2) return n.type === "like" || n.type === "comment";
    return true;
  });

  return (
    <Box minHeight="100vh">
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={2}
        borderBottom="1px solid"
        borderColor="divider"
        position="sticky"
        top={0}
        bgcolor="background.paper"
        zIndex={10}
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700} fontSize={18}>
          Notifications
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth">
        <Tab label="All" />
        <Tab label="Follows" />
        <Tab label="Likes & comments" />
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography textAlign="center" color="text.secondary" py={6}>
          No notifications yet
        </Typography>
      ) : (
        <List>
          {filtered.map((n) => {
            const sender = n.sender;
            const id = sender?._id;
            const state = followState[id] || "none";
            const isFollowType =
              n.type === "follow" || n.type === "follow_request";
            const isMe = id === user?._id;

            return (
              <ListItem key={n._id} sx={{ py: 1.5 }} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar
                    src={mediaUrl(sender?.avatar)}
                    component={Link}
                    to={`/${sender?.username}`}
                  >
                    {sender?.username?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography fontSize={14}>
                      <Typography
                        component={Link}
                        to={`/${sender?.username}`}
                        fontWeight={700}
                        fontSize={14}
                        sx={{ textDecoration: "none", color: "inherit" }}
                      >
                        {sender?.username}
                      </Typography>{" "}
                      {n.type === "follow" && "started following you"}
                      {n.type === "follow_request" && "requested to follow you"}
                      {n.type === "like" && "liked your post"}
                      {n.type === "comment" && `commented: ${n.comment || ""}`}
                    </Typography>
                  }
                  secondary={
                    n.createdAt
                      ? formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                        })
                      : ""
                  }
                />

                {isFollowType && !isMe && (
                  <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                    {state === "following" || state === "requested" ? (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => messageUser(sender)}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Message
                        </Button>
                        <IconButton
                          size="small"
                          onClick={(e) =>
                            setMenu({ anchor: e.currentTarget, user: sender })
                          }
                        >
                          <MoreHoriz />
                        </IconButton>
                      </>
                    ) : (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={state === "loading"}
                        onClick={() => followUser(sender)}
                        sx={{ textTransform: "none", borderRadius: 2, minWidth: 100 }}
                      >
                        {state === "loading" ? "..." : "Follow back"}
                      </Button>
                    )}
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      )}

      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => setMenu({ anchor: null, user: null })}
      >
        <MenuItem onClick={() => unfollowUser(menu.user)}>Unfollow</MenuItem>
        <MenuItem onClick={() => muteShared(menu.user)}>
          Mute shared activity
        </MenuItem>
        <MenuItem onClick={() => messageUser(menu.user)}>Message</MenuItem>
        <Divider />
        <MenuItem onClick={() => setMenu({ anchor: null, user: null })}>
          Cancel
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Notifications;