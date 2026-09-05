import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  Switch,
  FormControlLabel,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { ArrowBack, Image as ImageIcon, Mic, Stop } from "@mui/icons-material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

function FutureDropCreate() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [toSelf, setToSelf] = useState(true);
  const [following, setFollowing] = useState([]);
  const [recipientId, setRecipientId] = useState("");
  const [caption, setCaption] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  // From profile: /future-drops/new?to=USER_ID
  useEffect(() => {
    const to = searchParams.get("to");
    if (to) {
      setToSelf(false);
      setRecipientId(to);
    }
  }, [searchParams]);

  useEffect(() => {
    const loadFollowing = async () => {
      if (!token || !user?.username) return;
      try {
        const res = await fetch(
          `${API_URL}/api/users/${encodeURIComponent(user.username)}/following`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json().catch(() => ({}));
        setFollowing(data.users || []);
      } catch (err) {
        console.error(err);
        setFollowing([]);
      }
    };
    loadFollowing();
  }, [token, user]);

  const startRecording = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceBlob(blob);
        setFile(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setVoiceBlob(null);
    } catch (err) {
      console.error(err);
      setError("Microphone permission required");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setOk("");

    if (!unlockAt) {
      setError("Choose unlock date & time");
      return;
    }

    if (new Date(unlockAt) <= new Date()) {
      setError("Unlock time must be in the future");
      return;
    }

    if (!toSelf && !recipientId) {
      setError("Choose a recipient");
      return;
    }

    if (!caption.trim() && !file && !voiceBlob) {
      setError("Add a message, photo, video, or voice note");
      return;
    }

    setBusy(true);

    try {
      const form = new FormData();
      form.append("unlockAt", new Date(unlockAt).toISOString());
      form.append("toSelf", toSelf ? "true" : "false");

      if (!toSelf) {
        form.append("recipientId", recipientId);
      }

      if (caption.trim()) {
        form.append("caption", caption.trim());
      }

      if (file) {
        form.append("media", file);
      } else if (voiceBlob) {
        form.append("media", voiceBlob, `voice_${Date.now()}.webm`);
      }

      const res = await fetch(`${API_URL}/api/future-drops`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to create Future Drop");
      }

      setOk("Future Drop sealed 🔒");
      setTimeout(() => navigate("/future-drops"), 900);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        minHeight: "100vh",
        pb: 10,
        bgcolor: "background.default",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={2}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
        position="sticky"
        top={0}
        bgcolor="background.paper"
        zIndex={5}
      >
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={800} flex={1}>
          New Future Drop
        </Typography>
      </Box>

      <Stack spacing={2.5} px={2} py={2}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {ok ? <Alert severity="success">{ok}</Alert> : null}

        <FormControlLabel
          control={
            <Switch
              checked={toSelf}
              onChange={(e) => {
                setToSelf(e.target.checked);
                if (e.target.checked) setRecipientId("");
              }}
              color="secondary"
            />
          }
          label="Message to my future self"
        />

        {!toSelf ? (
          <TextField
            select
            fullWidth
            label="Send to"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
            helperText="Only people you follow appear here"
          >
            {following.length === 0 ? (
              <MenuItem disabled value="">
                No following yet
              </MenuItem>
            ) : (
              following.map((u) => (
                <MenuItem key={u.id || u._id} value={u.id || u._id}>
                  @{u.username}
                </MenuItem>
              ))
            )}
          </TextField>
        ) : null}

        <TextField
          fullWidth
          label="Unlock date & time"
          type="datetime-local"
          value={unlockAt}
          onChange={(e) => setUnlockAt(e.target.value)}
          InputLabelProps={{ shrink: true }}
          helperText="This stays locked until the chosen time"
        />

        <TextField
          fullWidth
          label="Message"
          placeholder="Write something for the future..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          multiline
          rows={3}
        />

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Button
            component="label"
            variant="outlined"
            startIcon={<ImageIcon />}
            disabled={busy || recording}
          >
            Photo / Video
            <input
              type="file"
              accept="image/*,video/*"
              hidden
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setFile(selected);
                setVoiceBlob(null);
              }}
            />
          </Button>

          {!recording ? (
            <Button
              variant="outlined"
              startIcon={<Mic />}
              onClick={startRecording}
              disabled={busy}
            >
              Voice note
            </Button>
          ) : (
            <Button
              color="error"
              variant="contained"
              startIcon={<Stop />}
              onClick={stopRecording}
            >
              Stop
            </Button>
          )}
        </Box>

        {file ? (
          <Typography fontSize={13} color="text.secondary">
            Selected file: {file.name}
          </Typography>
        ) : null}

        {voiceBlob ? (
          <Typography fontSize={13} color="text.secondary">
            Voice note ready to seal
          </Typography>
        ) : null}

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={busy}
          sx={{
            mt: 1,
            py: 1.4,
            borderRadius: 3,
            fontWeight: 800,
            bgcolor: "#ff2d8a",
            "&:hover": { bgcolor: "#e0267a" },
          }}
        >
          {busy ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Seal Future Drop 🔒"
          )}
        </Button>
      </Stack>
    </Box>
  );
}

export default FutureDropCreate;