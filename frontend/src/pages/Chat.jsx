import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  InputAdornment,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Send,
  GroupAdd,
  MoreVert,
  Block,
  Search,
  ArrowBack,
  AttachFile,
  EmojiEmotions,
  Close,
} from "@mui/icons-material";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { io } from "socket.io-client";
import { API_URL, SOCKET_URL } from "../config";

function Chat() {
  const { conversationId } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ---- Socket connection ----
  useEffect(() => {
    if (!token || !user) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("join", user._id);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(new Set(users));
    });

    socket.on("newMessage", (msg) => {
      if (msg.conversation === conversationId || msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
      // Update conversation list last message
      setConversations((prev) =>
        prev.map((c) =>
          c._id === (msg.conversation || msg.conversationId)
            ? { ...c, lastMessage: msg, updatedAt: msg.createdAt }
            : c
        )
      );
    });

    socket.on("messageDeleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    socket.on("userBlocked", ({ blockedUserId }) => {
      // Optionally remove from list or show indicator
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user, conversationId]);

  // ---- Fetch conversations ----
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // ---- Fetch messages for active conversation ----
  useEffect(() => {
    if (!conversationId || !token) {
      setActiveConv(null);
      setMessages([]);
      return;
    }

    const load = async () => {
      try {
        const [convRes, msgRes] = await Promise.all([
          fetch(`${API_URL}/api/conversations/${conversationId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const convData = await convRes.json();
        const msgData = await msgRes.json();

        if (convRes.ok) setActiveConv(convData.conversation);
        if (msgRes.ok) setMessages(msgData.messages || []);

        // Join room
        socketRef.current?.emit("joinConversation", conversationId);
      } catch (err) {
        console.error(err);
      }
    };

    load();
  }, [conversationId, token]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Send message (with @mentions support) ----
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      // Extract mentions: @username
      const mentionRegex = /@(\w+)/g;
      const mentions = [...newMessage.matchAll(mentionRegex)].map((m) => m[1]);

      const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: newMessage.trim(),
          mentions, // backend can resolve to user IDs
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Optimistic update (socket will also push)
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
        socketRef.current?.emit("sendMessage", data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  // ---- Create group ----
  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0) return;

    try {
      const res = await fetch(`${API_URL}/api/conversations/group`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: groupName.trim(),
          members: groupMembers.map((m) => m._id),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setConversations((prev) => [data.conversation, ...prev]);
        setCreateGroupOpen(false);
        setGroupName("");
        setGroupMembers([]);
        navigate(`/messages/${data.conversation._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Search users for group / DM ----
  const searchUsers = async (q) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setSearchResults(data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Block user ----
  const handleBlock = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAnchorEl(null);
        // Optionally leave conversation or mark as blocked
        navigate("/messages");
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Start private chat ----
  const startPrivateChat = async (otherUserId) => {
    try {
      const res = await fetch(`${API_URL}/api/conversations/private`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: otherUserId }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/messages/${data.conversation._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const name = c.isGroup
      ? c.name
      : c.participants?.find((p) => p._id !== user._id)?.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getConvDisplay = (conv) => {
    if (conv.isGroup) {
      return {
        name: conv.name,
        avatar: conv.avatar || null,
        isOnline: false,
      };
    }
    const other = conv.participants?.find((p) => p._id !== user._id);
    return {
      name: other?.username || "Unknown",
      avatar: other?.avatar,
      isOnline: onlineUsers.has(other?._id),
      otherUser: other,
    };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" height="calc(100vh - 64px)" bgcolor="background.default">
      {/* Sidebar - Conversations list */}
      <Box
        width={{ xs: conversationId ? 0 : "100%", md: 320 }}
        borderRight="1px solid"
        borderColor="divider"
        display={{ xs: conversationId ? "none" : "flex", md: "flex" }}
        flexDirection="column"
        bgcolor="background.paper"
      >
        <Box p={2} display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" fontWeight={700}>
            Messages
          </Typography>
          <Tooltip title="New group">
            <IconButton onClick={() => setCreateGroupOpen(true)} color="primary">
              <GroupAdd />
            </IconButton>
          </Tooltip>
        </Box>

        <Box px={2} pb={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ overflowY: "auto", flex: 1 }}>
          {filteredConversations.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              No conversations yet
            </Typography>
          ) : (
            filteredConversations.map((conv) => {
              const display = getConvDisplay(conv);
              const isActive = conv._id === conversationId;
              return (
                <ListItemButton
                  key={conv._id}
                  selected={isActive}
                  onClick={() => navigate(`/messages/${conv._id}`)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                      variant="dot"
                      color="success"
                      invisible={!display.isOnline}
                    >
                      <Avatar src={display.avatar}>
                        {display.name?.[0]?.toUpperCase()}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={isActive ? 700 : 500} noWrap>
                        {display.name}
                        {conv.isGroup && (
                          <Chip label="Group" size="small" sx={{ ml: 1, height: 18 }} />
                        )}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {conv.lastMessage?.text || "No messages yet"}
                      </Typography>
                    }
                  />
                </ListItemButton>
              );
            })
          )}
        </List>
      </Box>

      {/* Main chat area */}
      <Box flex={1} display="flex" flexDirection="column" bgcolor="#0a0a0a">
        {!conversationId ? (
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <Typography color="text.secondary">
              Select a conversation or start a new one
            </Typography>
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box
              p={1.5}
              display="flex"
              alignItems="center"
              gap={1}
              borderBottom="1px solid"
              borderColor="divider"
              bgcolor="background.paper"
            >
              <IconButton
                sx={{ display: { md: "none" } }}
                onClick={() => navigate("/messages")}
              >
                <ArrowBack />
              </IconButton>
              {activeConv && (
                <>
                  <Avatar src={getConvDisplay(activeConv).avatar}>
                    {getConvDisplay(activeConv).name?.[0]?.toUpperCase()}
                  </Avatar>
                  <Box flex={1}>
                    <Typography fontWeight={600}>
                      {getConvDisplay(activeConv).name}
                    </Typography>
                    {!activeConv.isGroup && getConvDisplay(activeConv).isOnline && (
                      <Typography variant="caption" color="success.main">
                        Online
                      </Typography>
                    )}
                  </Box>
                  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
                    <MoreVert />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={() => setAnchorEl(null)}
                  >
                    {!activeConv.isGroup && getConvDisplay(activeConv).otherUser && (
                      <MenuItem
                        onClick={() =>
                          handleBlock(getConvDisplay(activeConv).otherUser._id)
                        }
                        sx={{ color: "error.main" }}
                      >
                        <Block fontSize="small" sx={{ mr: 1 }} /> Block user
                      </MenuItem>
                    )}
                    <MenuItem onClick={() => setAnchorEl(null)}>View profile</MenuItem>
                  </Menu>
                </>
              )}
            </Box>

            {/* Messages */}
            <Box flex={1} overflow="auto" p={2} display="flex" flexDirection="column" gap={1}>
              {messages.map((msg) => {
                const isMine = msg.sender?._id === user._id || msg.sender === user._id;
                return (
                  <Box
                    key={msg._id}
                    alignSelf={isMine ? "flex-end" : "flex-start"}
                    maxWidth="70%"
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        px: 1.5,
                        py: 1,
                        bgcolor: isMine ? "primary.main" : "background.paper",
                        color: isMine ? "primary.contrastText" : "text.primary",
                        borderRadius: 2,
                        borderTopRightRadius: isMine ? 4 : 16,
                        borderTopLeftRadius: isMine ? 16 : 4,
                      }}
                    >
                      {!isMine && activeConv?.isGroup && (
                        <Typography variant="caption" fontWeight={600} display="block">
                          {msg.sender?.username}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                        {msg.text}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ opacity: 0.7, display: "block", textAlign: "right", mt: 0.5 }}
                      >
                        {msg.createdAt
                          ? formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })
                          : ""}
                      </Typography>
                    </Paper>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>

            {/* Input */}
            <Box
              component="form"
              onSubmit={handleSend}
              p={1.5}
              borderTop="1px solid"
              borderColor="divider"
              bgcolor="background.paper"
              display="flex"
              gap={1}
              alignItems="center"
            >
              <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
                <AttachFile />
              </IconButton>
              <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" />
              <TextField
                fullWidth
                size="small"
                placeholder="Message... (use @username to tag)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                multiline
                maxRows={4}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                  },
                }}
              />
              <IconButton type="submit" color="primary" disabled={!newMessage.trim() || sending}>
                {sending ? <CircularProgress size={24} /> : <Send />}
              </IconButton>
            </Box>
          </>
        )}
      </Box>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onClose={() => setCreateGroupOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Group name"
            margin="normal"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <TextField
            fullWidth
            label="Search users to add"
            margin="normal"
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              searchUsers(e.target.value);
            }}
          />
          <Box display="flex" flexWrap="wrap" gap={1} my={1}>
            {groupMembers.map((m) => (
              <Chip
                key={m._id}
                label={m.username}
                onDelete={() => setGroupMembers((prev) => prev.filter((x) => x._id !== m._id))}
                avatar={<Avatar src={m.avatar}>{m.username[0]}</Avatar>}
              />
            ))}
          </Box>
          <List dense>
            {searchResults
              .filter((u) => !groupMembers.some((m) => m._id === u._id) && u._id !== user._id)
              .map((u) => (
                <ListItem
                  key={u._id}
                  secondaryAction={
                    <Button size="small" onClick={() => setGroupMembers((prev) => [...prev, u])}>
                      Add
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={u.avatar}>{u.username[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={u.username} secondary={u.fullName} />
                </ListItem>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGroupOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || groupMembers.length === 0}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Chat;