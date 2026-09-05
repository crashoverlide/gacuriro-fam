import React, { useEffect, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Button,
  Divider,
} from "@mui/material";
import { Close, Search, Check, AddCircleOutline } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";

function ShareSheet({ open, onClose, postId }) {
  const { token, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: "" });

  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Prefer followers of current user (people you can send to)
        const res = await fetch(
          `http://localhost:5000/api/users/${user?.username}/followers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();

        if (res.ok && data.users?.length) {
          setUsers(data.users);
        } else {
          // fallback suggested
          const res2 = await fetch(
            "http://localhost:5000/api/users/suggested",
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const data2 = await res2.json();
          if (res2.ok) setUsers(data2.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [open, token, user]);

  const handleSend = async (toUser) => {
    try {
      const convRes = await fetch(
        "http://localhost:5000/api/messages/conversations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: toUser._id }),
        }
      );
      const convData = await convRes.json();

      if (convRes.ok && convData.conversation) {
        await fetch("http://localhost:5000/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            conversationId: convData.conversation._id,
            text: `Check this out: ${window.location.origin}/post/${postId}`,
          }),
        });
        setSentTo((prev) => [...prev, toUser._id]);
        setSnack({ open: true, message: "Sent!" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddToStory = () => {
    setSnack({ open: true, message: "Added to your story" });
    onClose();
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            height: "70vh",
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          },
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          p={2}
          borderBottom="1px solid"
          borderColor="divider"
        >
          <Typography fontWeight={700}>Send to</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        {/* Add to story */}
        <Box px={2} pt={2}>
          <Button
            fullWidth
            startIcon={<AddCircleOutline />}
            onClick={handleAddToStory}
            sx={{
              justifyContent: "flex-start",
              textTransform: "none",
              fontWeight: 600,
              py: 1.2,
              borderRadius: 2,
              bgcolor: "action.hover",
            }}
          >
            Add to your story
          </Button>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box px={2} pb={1}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{ overflowY: "auto" }}>
            {filtered.map((u) => {
              const alreadySent = sentTo.includes(u._id);
              return (
                <ListItem
                  key={u._id}
                  secondaryAction={
                    <Button
                      size="small"
                      variant={alreadySent ? "outlined" : "contained"}
                      onClick={() => !alreadySent && handleSend(u)}
                      disabled={alreadySent}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        minWidth: 70,
                        borderRadius: 2,
                      }}
                    >
                      {alreadySent ? <Check fontSize="small" /> : "Send"}
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={
                        u.avatar?.startsWith("http")
                          ? u.avatar
                          : u.avatar
                          ? `http://localhost:5000${u.avatar}`
                          : undefined
                      }
                    >
                      {u.username?.[0]?.toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={u.username}
                    secondary={u.fullName}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Drawer>

      <Snackbar
        open={snack.open}
        autoHideDuration={2000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success">{snack.message}</Alert>
      </Snackbar>
    </>
  );
}

export default ShareSheet;