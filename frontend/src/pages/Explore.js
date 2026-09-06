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
        if (res.ok) {
          setPosts(data.posts || []);
        }
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
    <Box sx={{ bgcolor: "#000", minHeight: "100vh", color: "#fff" }}>
      {/* Search bar */}
      <Box
        p={2}
        position="sticky"
        top={0}
        bgcolor="#000"
        zIndex={10}
        borderBottom="1px solid #222"
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
                <Search sx={{ color: "#888" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              bgcolor: "#1a1a1a",
              color: "#fff",
              "& fieldset": { borderColor: "#333" },
              "&:hover fieldset": { borderColor: "#ff2d8a" },
              "&.Mui-focused fieldset": { borderColor: "#ff2d8a" },
            },
            input: { color: "#fff" },
          }}
        />
      </Box>

      {/* Search results */}
      {query.trim() ? (
        <Box>
          {searching ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={28} sx={{ color: "#ff2d8a" }} />
            </Box>
          ) : users.length === 0 ? (
            <Typography textAlign="center" color="#666" py={6}>
              No users found for "{query}"
            </Typography>
          ) : (
            <List>
              {users.map((u) => (
                <ListItem key={u._id || u.id} disablePadding>
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
                        <Typography fontWeight={600} color="#fff">
                          {u.username}
                        </Typography>
                      }
                      secondary={
                        <Typography color="#888" fontSize={13}>
                          {u.fullName || u.full_name || ""}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress sx={{ color: "#ff2d8a" }} />
        </Box>
      ) : posts.length === 0 ? (
        <Typography textAlign="center" color="#666" py={8}>
          No posts yet. Be the first to post!
        </Typography>
      ) : (
        /* Explore grid */
        <Grid container spacing={0.5} sx={{ px: 0.5 }}>
          {posts.map((post) => {
            const media =
              post.mediaUrl ||
              post.media_url ||
              post.media?.[0]?.url ||
              post.image ||
              "";
            const fullUrl = mediaUrl(media);
            const isVideo =
              post.isReel ||
              post.is_reel ||
              post.mediaType === "video" ||
              post.media_type === "video" ||
              /\.(mp4|webm|mov)(\?|$)/i.test(media);

            return (
              <Grid item xs={4} key={post._id || post.id}>
                <Box
                  component={Link}
                  to={`/post/${post._id || post.id}`}
                  sx={{
                    display: "block",
                    aspectRatio: "1",
                    overflow: "hidden",
                    bgcolor: "#111",
                    position: "relative",
                  }}
                >
                  {fullUrl ? (
                    isVideo ? (
                      <video
                        src={fullUrl}
                        muted
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <img
                        src={fullUrl}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    )
                  ) : (
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                      color="#444"
                      fontSize={12}
                    >
                      No media
                    </Box>
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