import React, { useEffect, useState } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Grid,
  Typography,
  Avatar,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import { Search } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { mediaUrl } from "../utils/api";

function Explore() {
  const { token, user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Load explore posts
  useEffect(() => {
    const fetchExplore = async () => {
      try {
        const res = await fetch(`${API_URL}/api/posts/explore`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setPosts(data.posts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchExplore();
  }, [token]);

  // Live search users
  useEffect(() => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok) {
          const filtered = (data.users || []).filter(
            (u) => u._id !== user?._id && u.username !== user?.username
          );
          setUsers(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, token, user]);

  return (
    <Box>
      {/* Search bar */}
      <Box
        p={2}
        position="sticky"
        top={0}
        bgcolor="background.paper"
        zIndex={10}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              bgcolor: "action.hover",
            },
          }}
        />
      </Box>

      {/* Search results */}
      {query.trim() ? (
        <Box>
          {searching ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} />
            </Box>
          ) : users.length === 0 ? (
            <Typography textAlign="center" color="text.secondary" py={6}>
              No users found for "{query}"
            </Typography>
          ) : (
            <List>
              {users.map((u) => (
                <ListItem key={u._id} disablePadding>
                  <ListItemButton
                    component={Link}
                    to={`/${u.username}`}
                    sx={{ py: 1.5 }}
                  >
                    <ListItemAvatar>
                      <Avatar src={mediaUrl(u.avatar)}>
                        {u.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography fontWeight={600}>{u.username}</Typography>
                      }
                      secondary={u.fullName || ""}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        /* Explore grid */
        <Grid container spacing={0.5}>
          {posts.map((post) => {
            const media = post.media?.[0]?.url || post.image;
            const fullUrl = mediaUrl(media);
            return (
              <Grid item xs={4} key={post._id}>
                <Box
                  component={Link}
                  to={`/${post.user?.username}`}
                  sx={{
                    display: "block",
                    aspectRatio: "1",
                    overflow: "hidden",
                    bgcolor: "action.hover",
                  }}
                >
                  {fullUrl && (
                    <img
                      src={fullUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

export default Explore;