import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Button,
  IconButton,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Settings,
  MoreHoriz,
  GridOn,
  Movie,
  PersonPin,
  Lock,
} from "@mui/icons-material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import ProfileGrid from "../components/ProfileGrid";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function Profile() {
  const { username } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [following, setFollowing] = useState(false);
  const [menuEl, setMenuEl] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const isMe =
    user &&
    username &&
    String(user.username).toLowerCase() === String(username).toLowerCase();

  const load = async () => {
    if (!username || !token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/users/${encodeURIComponent(username)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setProfile(data.user);
        setFollowing(Boolean(data.user.isFollowing));
        setFullName(data.user.fullName || data.user.full_name || "");
        setBio(data.user.bio || "");
      } else {
        setProfile(null);
      }

      const pr = await fetch(
        `${API_URL}/api/users/${encodeURIComponent(username)}/posts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const pd = await pr.json().catch(() => ({}));
      setPosts(pd.posts || []);
    } catch {
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [username, token]);

  const handleFollow = async () => {
    if (!profile) return;
    const id = profile.id || profile._id;
    try {
      const res = await fetch(`${API_URL}/api/users/${id}/follow`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFollowing((f) => !f);
        setProfile((p) =>
          p
            ? {
                ...p,
                followersCount: Math.max(
                  0,
                  (p.followersCount || 0) + (following ? -1 : 1)
                ),
              }
            : p
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMessage = async () => {
    if (!profile) return;
    const id = profile.id || profile._id;
    try {
      const res = await fetch(`${API_URL}/api/messages/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: id }),
      });
      const data = await res.json().catch(() => ({}));
      const cid = data.conversation?.id || data.conversation?._id;
      if (cid) navigate(`/messages/${cid}`);
    } catch (e) {
      console.error(e);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append("fullName", fullName);
      form.append("bio", bio);
      if (avatarFile) form.append("avatar", avatarFile);

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        setEditOpen(false);
        load();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Future Drop → create, optionally targeting this user
  const goFutureDrop = () => {
    if (isMe) {
      navigate("/future-drops");
    } else if (profile) {
      const id = profile.id || profile._id;
      navigate(`/future-drops/new?to=${encodeURIComponent(id)}&username=${encodeURIComponent(profile.username)}`);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box textAlign="center" py={8}>
        <Typography fontWeight={700}>User not found</Typography>
      </Box>
    );
  }

  const avatar = mediaSrc(profile.avatar);
  const postsCount = profile.postsCount ?? posts.length;
  const followersCount = profile.followersCount ?? 0;
  const followingCount = profile.followingCount ?? 0;

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", pb: 10 }}>
      {/* Top bar */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1.5}
      >
        <Typography fontWeight={800} fontSize={18}>
          {profile.username}
        </Typography>
        <Box>
          {isMe ? (
            <IconButton onClick={() => navigate("/settings")}>
              <Settings />
            </IconButton>
          ) : (
            <IconButton onClick={(e) => setMenuEl(e.currentTarget)}>
              <MoreHoriz />
            </IconButton>
          )}
          <Menu
            anchorEl={menuEl}
            open={Boolean(menuEl)}
            onClose={() => setMenuEl(null)}
          >
            <MenuItem
              onClick={() => {
                setMenuEl(null);
                goFutureDrop();
              }}
            >
              Send Future Drop
            </MenuItem>
            <MenuItem onClick={() => setMenuEl(null)}>Copy profile URL</MenuItem>
            <MenuItem onClick={() => setMenuEl(null)}>Report</MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Header */}
      <Box display="flex" gap={3} px={2} py={1} alignItems="center">
        <Avatar
          src={avatar}
          sx={{ width: 86, height: 86, bgcolor: "#333", fontSize: 32 }}
        >
          {(profile.username || "U")[0]?.toUpperCase()}
        </Avatar>
        <Box flex={1} display="flex" justifyContent="space-around">
          <Box textAlign="center">
            <Typography fontWeight={800}>{postsCount}</Typography>
            <Typography fontSize={13} color="text.secondary">
              posts
            </Typography>
          </Box>
          <Box
            textAlign="center"
            component={Link}
            to={`/${profile.username}/followers`}
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <Typography fontWeight={800}>{followersCount}</Typography>
            <Typography fontSize={13} color="text.secondary">
              followers
            </Typography>
          </Box>
          <Box
            textAlign="center"
            component={Link}
            to={`/${profile.username}/following`}
            sx={{ textDecoration: "none", color: "inherit" }}
          >
            <Typography fontWeight={800}>{followingCount}</Typography>
            <Typography fontSize={13} color="text.secondary">
              following
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box px={2} mt={1}>
        <Typography fontWeight={700} fontSize={14}>
          {profile.fullName || profile.full_name || profile.username}
        </Typography>
        {profile.bio ? (
          <Typography fontSize={14} whiteSpace="pre-wrap">
            {profile.bio}
          </Typography>
        ) : null}
      </Box>

      {/* Actions */}
      <Box display="flex" gap={1} px={2} mt={2} flexWrap="wrap">
        {isMe ? (
          <>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => setEditOpen(true)}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              Edit profile
            </Button>
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<Lock />}
              onClick={() => navigate("/future-drops")}
              sx={{
                flex: 1,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#ff2d8a",
                "&:hover": { bgcolor: "#e0267a" },
              }}
            >
              Future Drops
            </Button>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => navigate("/future-drops/new")}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              New Drop
            </Button>
          </>
        ) : (
          <>
            <Button
              variant={following ? "outlined" : "contained"}
              size="small"
              onClick={handleFollow}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              {following ? "Following" : "Follow"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleMessage}
              sx={{ flex: 1, textTransform: "none", fontWeight: 700 }}
            >
              Message
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Lock />}
              onClick={goFutureDrop}
              sx={{
                flex: 1,
                textTransform: "none",
                fontWeight: 700,
                bgcolor: "#6C4DF6",
                "&:hover": { bgcolor: "#5535D9" },
              }}
            >
              Future Drop
            </Button>
          </>
        )}
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        variant="fullWidth"
        sx={{ mt: 2, borderTop: "1px solid", borderColor: "divider" }}
      >
        <Tab icon={<GridOn />} aria-label="posts" />
        <Tab icon={<Movie />} aria-label="reels" />
        <Tab icon={<PersonPin />} aria-label="tagged" />
      </Tabs>

      {tab === 0 && (
        <ProfileGrid
          posts={posts}
          onOpen={(p) => navigate(`/post/${p.id || p._id}`)}
        />
      )}
      {tab === 1 && (
        <ProfileGrid
          posts={posts.filter(
            (p) =>
              p.isReel ||
              p.is_reel ||
              p.mediaType === "video" ||
              p.media_type === "video"
          )}
          onOpen={(p) => navigate(`/post/${p.id || p._id}`)}
        />
      )}
      {tab === 2 && (
        <Typography textAlign="center" color="text.secondary" py={4}>
          No tagged posts
        </Typography>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit profile</DialogTitle>
        <DialogContent>
          <Button component="label" sx={{ mb: 2 }}>
            Change photo
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
            />
          </Button>
          <TextField
            fullWidth
            label="Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveProfile} disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Profile;