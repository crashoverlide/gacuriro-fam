import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Grid,
  CircularProgress,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function Archive() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stories/archive/list`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) setStories(data.stories || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  const media = (s) => {
    const u = s.media?.url;
    if (!u) return "";
    return u.startsWith("http") ? u : `${API_URL}${u}`;
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
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
          Archive
        </Typography>
      </Box>

      <Typography px={2} py={1.5} color="text.secondary" fontSize={13}>
        Only you can see your archived stories unless you choose to share them.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={0.5} px={0.5}>
          {stories.map((s) => (
            <Grid item xs={4} key={s._id}>
              <Box position="relative" sx={{ aspectRatio: "1/1", bgcolor: "#111" }}>
                {s.media?.type === "video" ? (
                  <video
                    src={media(s)}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={media(s)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                )}
                <Typography
                  sx={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    bgcolor: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    fontSize: 11,
                    px: 0.8,
                    py: 0.3,
                    borderRadius: 1,
                  }}
                >
                  {new Date(s.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default Archive;