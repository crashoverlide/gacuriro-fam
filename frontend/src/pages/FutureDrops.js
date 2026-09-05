import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  IconButton,
  CircularProgress,
  Chip,
} from "@mui/material";
import { ArrowBack, Add, Lock, LockOpen } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function DropCard({ drop, onOpen }) {
  const unlocked = drop.unlocked && !drop.locked;
  const when = new Date(drop.unlockAt).toLocaleString();

  return (
    <Card
      sx={{
        mb: 1.5,
        bgcolor: unlocked ? "background.paper" : "#111",
        color: unlocked ? "text.primary" : "#fff",
        border: "1px solid",
        borderColor: unlocked ? "divider" : "#333",
        borderRadius: 3,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          {unlocked ? (
            <LockOpen sx={{ color: "#4ade80" }} />
          ) : (
            <Lock sx={{ color: "#ff2d8a" }} />
          )}
          <Typography fontWeight={700} fontSize={14}>
            {drop.isSelf
              ? "To future me"
              : drop.isCreator
              ? `To @${drop.recipient?.username || "user"}`
              : `From @${drop.creator?.username || "user"}`}
          </Typography>
          <Chip
            size="small"
            label={unlocked ? "Unlocked" : "Locked"}
            sx={{
              ml: "auto",
              bgcolor: unlocked ? "#14532d" : "#3b0764",
              color: "#fff",
              height: 22,
              fontSize: 11,
            }}
          />
        </Box>

        <Typography fontSize={13} color={unlocked ? "text.secondary" : "#aaa"}>
          {unlocked ? drop.preview || drop.caption : `Unlocks ${when}`}
        </Typography>

        {unlocked && drop.mediaUrl && drop.mediaType === "image" && (
          <Box
            component="img"
            src={mediaSrc(drop.mediaUrl)}
            alt=""
            sx={{
              mt: 1.5,
              width: "100%",
              maxHeight: 220,
              objectFit: "cover",
              borderRadius: 2,
            }}
          />
        )}
        {unlocked && drop.mediaUrl && drop.mediaType === "video" && (
          <video
            src={mediaSrc(drop.mediaUrl)}
            controls
            playsInline
            style={{
              marginTop: 12,
              width: "100%",
              maxHeight: 220,
              borderRadius: 8,
              background: "#000",
            }}
          />
        )}
        {unlocked && drop.mediaUrl && drop.mediaType === "audio" && (
          <audio
            controls
            src={mediaSrc(drop.mediaUrl)}
            style={{ marginTop: 12, width: "100%" }}
          />
        )}
        {unlocked && drop.caption && (
          <Typography mt={1.5} fontSize={15}>
            {drop.caption}
          </Typography>
        )}

        <Button
          size="small"
          sx={{ mt: 1.5, textTransform: "none", fontWeight: 700 }}
          onClick={() => onOpen(drop)}
        >
          {unlocked ? "Open" : "View details"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FutureDrops() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`${API_URL}/api/future-drops/inbox`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/future-drops/sent`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const da = await a.json().catch(() => ({}));
      const db = await b.json().catch(() => ({}));
      setInbox(da.drops || []);
      setSent(db.drops || []);
    } catch {
      setInbox([]);
      setSent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const list = tab === 0 ? inbox : sent;

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", pb: 10, minHeight: "100vh" }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800} flex={1}>
          Future Drops
        </Typography>
        <IconButton color="primary" component={Link} to="/future-drops/new">
          <Add />
        </IconButton>
      </Box>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="fullWidth">
        <Tab label="Inbox" />
        <Tab label="Sent" />
      </Tabs>

      <Box px={2} py={2}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : list.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" mb={2}>
              {tab === 0 ? "No drops for you yet" : "You haven’t sealed any drops"}
            </Typography>
            <Button
              variant="contained"
              component={Link}
              to="/future-drops/new"
              sx={{ bgcolor: "#ff2d8a" }}
            >
              Create Future Drop
            </Button>
          </Box>
        ) : (
          list.map((d) => (
            <DropCard
              key={d.id}
              drop={d}
              onOpen={(drop) => navigate(`/future-drops/${drop.id}`)}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

export default FutureDrops;