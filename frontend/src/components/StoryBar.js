import React, { useEffect, useState, useMemo } from "react";
import { Box, Avatar, Typography, Skeleton, Badge } from "@mui/material";
import { Add } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import StoryViewer from "./StoryViewer";
import { API_URL } from "../config";

function StoryBar() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStories, setViewerStories] = useState([]);

  const getAvatar = (avatar) => {
    if (!avatar) return undefined;
    if (avatar.startsWith("http")) return avatar;
    return `${API_URL}${avatar}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/stories`, {
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

  const grouped = useMemo(() => {
    const map = {};
    stories.forEach((s) => {
      const id = s.user?._id;
      if (!id) return;
      if (!map[id]) map[id] = { user: s.user, items: [], seen: true };
      map[id].items.push(s);
      if (!s.seen) map[id].seen = false;
    });
    return Object.values(map);
  }, [stories]);

  const openUserStories = (group) => {
    setViewerStories(group.items);
    setViewerOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" gap={2} px={2} py={2}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} variant="circular" width={66} height={66} />
        ))}
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          px: 2,
          py: 2,
          overflowX: "auto",
          borderBottom: "1px solid",
          borderColor: "divider",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box
          textAlign="center"
          minWidth={74}
          sx={{ cursor: "pointer" }}
          onClick={() => navigate("/create")}
        >
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            badgeContent={
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #000",
                }}
              >
                <Add sx={{ fontSize: 14, color: "#fff" }} />
              </Box>
            }
          >
            <Avatar
              src={getAvatar(user?.avatar)}
              sx={{ width: 66, height: 66, border: "2px dashed #555" }}
            >
              {user?.username?.[0]?.toUpperCase()}
            </Avatar>
          </Badge>
          <Typography variant="caption" display="block" mt={0.7} noWrap maxWidth={74}>
            Your story
          </Typography>
        </Box>

        {grouped.map((g) => (
          <Box
            key={g.user?._id}
            textAlign="center"
            minWidth={74}
            sx={{ cursor: "pointer" }}
            onClick={() => openUserStories(g)}
          >
            <Avatar
              sx={{
                width: 66,
                height: 66,
                p: "3px",
                background: g.seen
                  ? "#444"
                  : "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              }}
            >
              <Avatar
                src={getAvatar(g.user?.avatar)}
                sx={{ width: 60, height: 60, border: "2px solid #000" }}
              >
                {g.user?.username?.[0]?.toUpperCase()}
              </Avatar>
            </Avatar>
            <Typography variant="caption" noWrap maxWidth={74} display="block" mt={0.7}>
              {g.user?.username}
            </Typography>
          </Box>
        ))}
      </Box>

      <StoryViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        stories={viewerStories}
        onDeleted={(id) => {
          setStories((prev) => prev.filter((s) => s._id !== id));
          setViewerStories((prev) => prev.filter((s) => s._id !== id));
        }}
      />
    </>
  );
}

export default StoryBar;