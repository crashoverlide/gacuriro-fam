import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { Search, ArrowBack } from "@mui/icons-material";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Followers() {
  const { username } = useParams();
  const { token, user: me } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [followingMap, setFollowingMap] = useState({});

  const getAvatarUrl = (avatar) => {
    if (!avatar) return undefined;
    if (avatar.startsWith("http")) return avatar;
    return `http://localhost:5000${avatar}`;
  };

  useEffect(() => {
    const fetchFollowers = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:5000/api/users/${username}/followers`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (res.ok) {
          const list = data.users || [];
          setUsers(list);
          const map = {};
          list.forEach((u) => {
            map[u._id] = u.isFollowing || false;
          });
          setFollowingMap(map);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token && username) fetchFollowers();
  }, [username, token]);

  const handleFollow = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setFollowingMap((prev) => ({
          ...prev,
          [id]: data.following,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={2}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700} fontSize={18}>
          Followers
        </Typography>
      </Box>

      <Box p={2}>
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
          sx={{ mb: 1 }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography textAlign="center" color="text.secondary" py={6}>
          No followers found
        </Typography>
      ) : (
        <List>
          {filtered.map((u) => {
            const isMe = u._id === me?._id || u.username === me?.username;
            const isFollowing = followingMap[u._id];

            return (
              <ListItem
                key={u._id}
                secondaryAction={
                  !isMe && (
                    <Button
                      size="small"
                      variant={isFollowing ? "outlined" : "contained"}
                      onClick={() => handleFollow(u._id)}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        minWidth: 90,
                        borderRadius: 2,
                      }}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                  )
                }
              >
                <ListItemAvatar>
                  <Avatar
                    src={getAvatarUrl(u.avatar)}
                    component={Link}
                    to={`/${u.username}`}
                  >
                    {u.username?.[0]?.toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      component={Link}
                      to={`/${u.username}`}
                      fontWeight={600}
                      fontSize={14}
                      sx={{ textDecoration: "none", color: "inherit" }}
                    >
                      {u.username}
                    </Typography>
                  }
                  secondary={u.fullName}
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}

export default Followers;