import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function MentionInput({ value, onChange, placeholder = "Write a caption..." }) {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  // Detect @ or # while typing
  const handleChange = (e) => {
    const text = e.target.value;
    const pos = e.target.selectionStart;
    onChange(text);
    setCursorPos(pos);

    // Find the word being typed
    const before = text.slice(0, pos);
    const match = before.match(/([@#][\w]*)$/);

    if (match) {
      const query = match[1];
      setMentionQuery(query);
      setShowSuggestions(true);

      if (query.startsWith("@") && query.length > 1) {
        searchUsers(query.slice(1));
      } else if (query.startsWith("#") && query.length > 1) {
        // simple local hashtag suggestions (or call API)
        setSuggestions(
          ["love", "travel", "food", "fashion", "music", "art"]
            .filter((h) => h.startsWith(query.slice(1).toLowerCase()))
            .map((h) => ({ type: "hashtag", name: h }))
        );
      }
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const searchUsers = async (q) => {
    try {
      const res = await fetch(
        `${API_URL}/api/users/search?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (res.ok) {
        setSuggestions(
          (data.users || []).map((u) => ({
            type: "user",
            ...u,
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const insertSuggestion = (item) => {
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);

    const match = before.match(/([@#][\w]*)$/);
    if (!match) return;

    const start = before.length - match[1].length;
    let insert = "";

    if (item.type === "user") {
      insert = `@${item.username} `;
    } else {
      insert = `#${item.name} `;
    }

    const newValue = before.slice(0, start) + insert + after;
    onChange(newValue);
    setShowSuggestions(false);
  };

  return (
    <Box position="relative">
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline
        minRows={3}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        variant="standard"
        InputProps={{ disableUnderline: true }}
      />

      {showSuggestions && suggestions.length > 0 && (
        <Paper
          elevation={8}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            maxHeight: 220,
            overflow: "auto",
            borderRadius: 2,
          }}
        >
          <List dense>
            {suggestions.map((item, i) => (
              <ListItemButton key={i} onClick={() => insertSuggestion(item)}>
                {item.type === "user" ? (
                  <>
                    <ListItemAvatar>
                      <Avatar src={item.avatar} sx={{ width: 32, height: 32 }}>
                        {item.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={item.username}
                      secondary={item.fullName}
                    />
                  </>
                ) : (
                  <ListItemText
                    primary={`#${item.name}`}
                    secondary="Hashtag"
                  />
                )}
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default MentionInput;