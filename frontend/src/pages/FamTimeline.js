import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
  TextField,
  Button,
  Stack,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Fade,
  Zoom,
} from "@mui/material";
import {
  ArrowBack,
  Image as ImageIcon,
  Mic,
  Stop,
  Send,
  Favorite,
  FavoriteBorder,
  ChatBubbleOutline,
  Repeat,
} from "@mui/icons-material";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { keyframes } from "@mui/system";

const pop = keyframes`
  0% { transform: scale(0.4); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const bounceIcon = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.35); }
  100% { transform: scale(1); }
`;

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function MomentCard({ moment, token, user }) {
  const lastTap = useRef(0);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const [animLike, setAnimLike] = useState(false);
  const [animComment, setAnimComment] = useState(false);
  const [animSend, setAnimSend] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");

  const src = mediaSrc(moment.mediaUrl);
  const isVideo = moment.mediaType === "video";
  const isAudio = moment.mediaType === "audio";
  const isImage = moment.mediaType === "image" || (!isVideo && !isAudio && src);

  const triggerLike = () => {
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    setAnimLike(true);
    setTimeout(() => setAnimLike(false), 400);
    if (next) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 700);
    }
  };

  const onMediaTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) triggerLike();
      else {
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 700);
      }
    }
    lastTap.current = now;
  };

  const openComments = () => {
    setAnimComment(true);
    setTimeout(() => setAnimComment(false), 400);
    setCommentsOpen(true);
  };

  const sendComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: commentText.trim(),
        user: { username: user?.username, avatar: user?.avatar },
      },
    ]);
    setCommentText("");
  };

  const onSend = () => {
    setAnimSend(true);
    setTimeout(() => setAnimSend(false), 400);
    // share moment link via DM later
  };

  const onRepost = () => {
    setReposted((v) => !v);
  };

  return (
    <Box display="flex" gap={1.5} mb={3}>
      <Box display="flex" flexDirection="column" alignItems="center" width={40}>
        <Avatar
          src={mediaSrc(moment.user?.avatar)}
          component={Link}
          to={`/${moment.user?.username || ""}`}
          sx={{ width: 36, height: 36 }}
        >
          {(moment.user?.username || "U")[0]?.toUpperCase()}
        </Avatar>
      </Box>

      <Box flex={1}>
        <Typography fontSize={12} color="text.secondary">
          {formatTime(moment.momentTime || moment.createdAt)} · @
          {moment.user?.username || "user"}
        </Typography>
        {moment.caption ? (
          <Typography fontSize={14} mt={0.5}>
            {moment.caption}
          </Typography>
        ) : null}

        {(isImage || isVideo) && (
          <Box
            onClick={onMediaTap}
            sx={{
              position: "relative",
              mt: 1,
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "#111",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {isVideo ? (
              <video
                src={src}
                muted
                autoPlay
                loop
                playsInline
                style={{
                  width: "100%",
                  maxHeight: 360,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <Box
                component="img"
                src={src}
                alt=""
                sx={{
                  width: "100%",
                  maxHeight: 360,
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}

            <Fade in={showHeart}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <Zoom in={showHeart}>
                  <Favorite
                    sx={{
                      fontSize: 80,
                      color: "#fff",
                      animation: `${pop} 0.45s ease`,
                      filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
                    }}
                  />
                </Zoom>
              </Box>
            </Fade>
          </Box>
        )}

        {isAudio && src && (
          <audio controls src={src} style={{ marginTop: 8, width: "100%" }} />
        )}

        {/* Instagram-style action row */}
        <Box display="flex" alignItems="center" gap={0.5} mt={0.5} ml={-1}>
          <IconButton
            size="small"
            onClick={triggerLike}
            sx={{
              color: liked ? "#ff2d8a" : "text.primary",
              animation: animLike ? `${bounceIcon} 0.35s ease` : "none",
            }}
          >
            {liked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
          </IconButton>
          <IconButton
            size="small"
            onClick={openComments}
            sx={{
              animation: animComment ? `${bounceIcon} 0.35s ease` : "none",
            }}
          >
            <ChatBubbleOutline fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onRepost}
            sx={{ color: reposted ? "#4ade80" : "text.primary" }}
          >
            <Repeat fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onSend}
            sx={{
              animation: animSend ? `${bounceIcon} 0.35s ease` : "none",
            }}
          >
            <Send fontSize="small" />
          </IconButton>
          {likes > 0 && (
            <Typography fontSize={12} fontWeight={700} ml={0.5}>
              {likes} likes
            </Typography>
          )}
        </Box>

        <Typography
          fontSize={12}
          color="text.secondary"
          sx={{ cursor: "pointer", mt: 0.25 }}
          onClick={openComments}
        >
          {comments.length ? `View ${comments.length} comments` : "Add a comment…"}
        </Typography>
      </Box>

      <Dialog
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Comments</DialogTitle>
        <DialogContent>
          {comments.length === 0 ? (
            <Typography color="text.secondary" fontSize={14}>
              No comments yet
            </Typography>
          ) : (
            comments.map((c) => (
              <Box key={c.id} display="flex" gap={1} mb={1.5}>
                <Avatar src={mediaSrc(c.user?.avatar)} sx={{ width: 28, height: 28 }}>
                  {(c.user?.username || "U")[0]}
                </Avatar>
                <Typography fontSize={14}>
                  <b>{c.user?.username || "user"}</b> {c.text}
                </Typography>
              </Box>
            ))
          )}
          <Box display="flex" gap={1} mt={2}>
            <TextField
              fullWidth
              size="small"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
            />
            <Button onClick={sendComment}>Post</Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function FamTimeline() {
  const { linkId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingBlob, setPendingBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fam-links/${linkId}/moments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      setMoments(data.moments || []);
    } catch {
      setMoments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && linkId) load();
  }, [token, linkId]);

  const uploadMoment = async ({ file, blob, text }) => {
    setUploading(true);
    try {
      const form = new FormData();
      if (file) form.append("media", file);
      if (blob) form.append("media", blob, `voice_${Date.now()}.webm`);
      if (text) form.append("caption", text);
      form.append("momentTime", new Date().toISOString());

      const res = await fetch(`${API_URL}/api/fam-links/${linkId}/moments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (res.ok) {
        setCaption("");
        setPendingBlob(null);
        await load();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setPendingBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Microphone permission required");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto", minHeight: "100vh", pb: 14 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
        position="sticky"
        top={0}
        bgcolor="background.paper"
        zIndex={10}
      >
        <IconButton onClick={() => navigate("/fam")}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800}>Fam Timeline</Typography>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={28} />
        </Box>
      ) : moments.length === 0 ? (
        <Typography textAlign="center" color="text.secondary" py={6}>
          No moments yet — add a photo, video, or voice note.
        </Typography>
      ) : (
        <Box px={2} py={2}>
          {moments.map((m) => (
            <MomentCard key={m.id} moment={m} token={token} user={user} />
          ))}
        </Box>
      )}

      <Paper
        elevation={8}
        sx={{
          position: "fixed",
          bottom: 56,
          left: 0,
          right: 0,
          maxWidth: 560,
          mx: "auto",
          p: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton component="label" disabled={uploading}>
            <ImageIcon />
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadMoment({ file: f, text: caption });
                e.target.value = "";
              }}
            />
          </IconButton>

          {!recording && !pendingBlob && (
            <IconButton onClick={startRecording} disabled={uploading}>
              <Mic />
            </IconButton>
          )}

          {recording && (
            <>
              <IconButton color="error" onClick={stopRecording}>
                <Stop />
              </IconButton>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  stopRecording();
                  setTimeout(() => {
                    const blob =
                      pendingBlob ||
                      (chunksRef.current.length
                        ? new Blob(chunksRef.current, { type: "audio/webm" })
                        : null);
                    if (blob) uploadMoment({ blob, text: caption });
                  }, 200);
                }}
              >
                Send voice
              </Button>
            </>
          )}

          {pendingBlob && !recording && (
            <Button
              size="small"
              variant="contained"
              startIcon={<Send />}
              onClick={() => uploadMoment({ blob: pendingBlob, text: caption })}
            >
              Send voice
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            disabled={uploading || !caption.trim()}
            onClick={() => uploadMoment({ text: caption })}
            sx={{ ml: "auto" }}
          >
            Post text
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default FamTimeline;