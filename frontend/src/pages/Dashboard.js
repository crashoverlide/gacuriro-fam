import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Grid,
  Button,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Dashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/${user.username}/posts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setPosts(data.posts || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token && user?.username) load();
  }, [token, user]);

  const totalLikes = posts.reduce((a, p) => a + (p.likes?.length || 0), 0);
  const totalComments = posts.reduce((a, p) => a + (p.comments?.length || 0), 0);
  const top = [...posts].sort(
    (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
  )[0];

  return (
    <Box minHeight="100vh" p={2}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700} fontSize={18}>
          Professional dashboard
        </Typography>
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h5" fontWeight={800}>
                  {posts.length}
                </Typography>
                <Typography color="text.secondary">Posts</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h5" fontWeight={800}>
                  {totalLikes}
                </Typography>
                <Typography color="text.secondary">Likes</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="h5" fontWeight={800}>
                  {totalComments}
                </Typography>
                <Typography color="text.secondary">Comments</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Typography fontWeight={700} mb={1}>
            Your current top post
          </Typography>
          <Paper sx={{ p: 2, mb: 2 }}>
            {top ? (
              <Typography>
                {top.caption || "Untitled"} · {top.likes?.length || 0} likes
              </Typography>
            ) : (
              <Typography color="text.secondary">No posts yet</Typography>
            )}
          </Paper>

          <Button variant="contained" onClick={() => navigate("/create")}>
            Create ad / post
          </Button>
        </>
      )}
    </Box>
  );
}

export default Dashboard;