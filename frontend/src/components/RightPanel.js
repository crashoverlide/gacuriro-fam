import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function RightPanel() {
  const { user, token } = useAuth();
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggested = async () => {
      try {
        const res = await fetch(
          "http://localhost:5000/api/users/suggested",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (res.ok) setSuggested(data.users || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchSuggested();
  }, [token]);

  const handleFollow = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggested((prev) =>
        prev.filter((u) => u._id !== id && u.id !== id)
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        width: 320,
        position: "fixed",
        right: 0,
        top: 0,
        height: "100vh",
        p: 3,
        display: { xs: "none", lg: "block" },
        overflowY: "auto",
        bgcolor: "background.default",
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={4}>
        <Avatar
          src={user?.avatar}
          component={Link}
          to={`/${user?.username}`}
          sx={{ width: 56, height: 56 }}
        >
          {user?.username?.[0]?.toUpperCase()}
        </Avatar>
        <Box flex={1}>
          <Typography
            component={Link}
            to={`/${user?.username}`}
            fontWeight={600}
            fontSize={14}
            sx={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            {user?.username}
          </Typography>
          <Typography variant="body2" color="text.secondary" fontSize={13}>
            {user?.fullName}
          </Typography>
        </Box>
        <Button
          size="small"
          sx={{
            fontWeight: 600,
            fontSize: 12,
            color: "primary.main",
            minWidth: "auto",
            p: 0,
          }}
        >
          Switch
        </Button>
      </Box>

      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography
          variant="body2"
          fontWeight={600}
          color="text.secondary"
          fontSize={14}
        >
          Suggested for you
        </Typography>
        <Typography
          component={Link}
          to="/explore"
          variant="body2"
          fontWeight={600}
          fontSize={12}
          sx={{ textDecoration: "none", color: "inherit" }}
        >
          See all
        </Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={24} />
        </Box>
      ) : suggested.length === 0 ? (
        <Typography variant="body2" color="text.secondary" fontSize={13}>
          No suggestions right now
        </Typography>
      ) : (
        <List disablePadding>
          {suggested.slice(0, 5).map((u) => (
            <ListItem
              key={u._id || u.id}
              disablePadding
              sx={{ mb: 1.5 }}
              secondaryAction={
                <Button
                  size="small"
                  onClick={() => handleFollow(u._id || u.id)}
                  sx={{
                    fontWeight: 600,
                    fontSize: 12,
                    color: "primary.main",
                    minWidth: "auto",
                  }}
                >
                  Follow
                </Button>
              }
            >
              <ListItemAvatar sx={{ minWidth: 48 }}>
                <Avatar
                  src={u.avatar}
                  component={Link}
                  to={`/${u.username}`}
                  sx={{ width: 40, height: 40 }}
                >
                  {u.username?.[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    component={Link}
                    to={`/${u.username}`}
                    variant="body2"
                    fontWeight={600}
                    fontSize={13}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    {u.username}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {u.followersCount || 0} followers
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mt={5}
        fontSize={11}
        lineHeight={1.6}
      >
        About · Help · API · Jobs · Privacy · Terms · Locations · Language
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        mt={1.5}
        fontSize={11}
      >
        © 2026 GACURIRO FAM
      </Typography>
    </Box>
  );
}

export default RightPanel;