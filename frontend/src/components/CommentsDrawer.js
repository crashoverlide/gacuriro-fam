import React, { useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import { Close, Send } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";

function CommentsDrawer({ open, onClose, postId, comments = [], onCommentAdded }) {
  const { token, user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [localComments, setLocalComments] = useState(comments);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch(
        `http://localhost:5000/api/posts/${postId}/comment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: text.trim() }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setLocalComments(data.comments || []);
        onCommentAdded?.(data.comments || []);
        setText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: "70vh",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          bgcolor: "#111",
          color: "#fff",
        },
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={2}
        borderBottom="1px solid #333"
      >
        <Typography fontWeight={700}>Comments</Typography>
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <Close />
        </IconButton>
      </Box>

      {/* Comments list */}
      <Box flex={1} overflow="auto" px={2}>
        {localComments.length === 0 ? (
          <Typography
            textAlign="center"
            color="#888"
            py={6}
            fontSize={14}
          >
            No comments yet. Be the first!
          </Typography>
        ) : (
          <List>
            {localComments.map((c, i) => (
              <ListItem key={c._id || i} alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar
                    src={c.user?.avatar}
                    sx={{ width: 32, height: 32 }}
                  >
                    {c.user?.username?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography fontSize={14}>
                      <strong>{c.user?.username}</strong>{" "}
                      {c.text}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="#888">
                      {c.createdAt
                        ? formatDistanceToNow(new Date(c.createdAt), {
                            addSuffix: true,
                          })
                        : ""}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      <Divider sx={{ borderColor: "#333" }} />

      {/* Write comment */}
      <Box display="flex" alignItems="center" gap={1} p={1.5}>
        <Avatar
          src={user?.avatar}
          sx={{ width: 32, height: 32 }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </Avatar>
        <TextField
          fullWidth
          size="small"
          placeholder="Add a comment..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          sx={{
            input: { color: "#fff" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 5,
              bgcolor: "#222",
              "& fieldset": { borderColor: "#444" },
            },
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!text.trim() || sending}
          sx={{ color: text.trim() ? "#0095f6" : "#555" }}
        >
          <Send />
        </IconButton>
      </Box>
    </Drawer>
  );
}

export default CommentsDrawer;