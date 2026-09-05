import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Paper,
  InputAdornment,
  Button,
} from "@mui/material";
import {
  Send,
  ArrowBack,
  Search,
  Mic,
  Stop,
  Image as ImageIcon,
  Call,
  Videocam,
} from "@mui/icons-material";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { connectSocket } from "../utils/socket";
import VoiceCall from "../components/VoiceCall";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function Chat() {
  const { conversationId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pendingVoice, setPendingVoice] = useState(null);
  const [search, setSearch] = useState("");
  const [otherUser, setOtherUser] = useState(null);

  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState("voice");
  const [isCaller, setIsCaller] = useState(false);
  const [incoming, setIncoming] = useState(null);
  const [callTarget, setCallTarget] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);
  const myId = String(user?._id || user?.id || "");

  useEffect(() => {
    if (!myId) return;
    const sock = connectSocket(myId);
    if (!sock) return;
    const onIncoming = (payload) => {
      setIncoming(payload);
      setCallMode(payload?.mode === "video" ? "video" : "voice");
      setIsCaller(false);
      setCallTarget({
        id: payload.fromUserId,
        _id: payload.fromUserId,
        username: payload.fromUsername,
        avatar: payload.fromAvatar,
      });
      setCallOpen(true);
    };
    sock.on("call:incoming", onIncoming);
    return () => sock.off("call:incoming", onIncoming);
  }, [myId]);

  useEffect(() => {
    if (conversationId) return;
    const fetchConversations = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        setConversations(data.conversations || []);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchConversations();
  }, [conversationId, token]);

  useEffect(() => {
    if (!conversationId || !token) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/messages/${conversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        setMessages(data.messages || []);
        if (data.otherUser) setOtherUser(data.otherUser);
      } catch {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [conversationId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !conversationId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setText("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
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
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setPendingVoice(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setPendingVoice(null);
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

  const sendVoice = async (blob) => {
    if (!conversationId || !blob) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("conversationId", conversationId);
      form.append("media", blob, `voice_${Date.now()}.webm`);
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setPendingVoice(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const onSendVoiceClick = () => {
    if (recording) {
      stopRecording();
      setTimeout(() => {
        const blob =
          pendingVoice ||
          (chunksRef.current.length
            ? new Blob(chunksRef.current, { type: "audio/webm" })
            : null);
        if (blob) sendVoice(blob);
      }, 250);
    } else if (pendingVoice) {
      sendVoice(pendingVoice);
    }
  };

  const sendImage = async (file) => {
    if (!file || !conversationId) return;
    setSending(true);
    try {
      const form = new FormData();
      form.append("conversationId", conversationId);
      form.append("media", file);
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const startVoiceCall = () => {
    if (!otherUser) return;
    setCallTarget(otherUser);
    setCallMode("voice");
    setIsCaller(true);
    setIncoming(null);
    setCallOpen(true);
  };

  const startVideoCall = () => {
    if (!otherUser) return;
    setCallTarget(otherUser);
    setCallMode("video");
    setIsCaller(true);
    setIncoming(null);
    setCallOpen(true);
  };

  if (!conversationId) {
    const filtered = conversations.filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return String(c.group_name || c.title || c.last_message || "")
        .toLowerCase()
        .includes(q);
    });

    return (
      <Box sx={{ maxWidth: 480, mx: "auto", minHeight: "100vh", pb: 8 }}>
        <Box px={2} py={1.5}>
          <Typography fontWeight={800} fontSize={20}>
            Messages
          </Typography>
        </Box>
        <Box px={2} pb={1}>
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
          />
        </Box>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List>
            {filtered.map((c) => {
              const id = c.id || c._id;
              return (
                <ListItem key={id} button component={Link} to={`/messages/${id}`}>
                  <ListItemAvatar>
                    <Avatar>{String(c.group_name || "C")[0]}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={c.group_name || c.title || "Chat"}
                    secondary={c.last_message || ""}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1}
        py={1}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <IconButton onClick={() => navigate("/messages")}>
          <ArrowBack />
        </IconButton>
        <Avatar src={mediaSrc(otherUser?.avatar)} sx={{ width: 36, height: 36 }}>
          {(otherUser?.username || "U")[0]?.toUpperCase()}
        </Avatar>
        <Typography fontWeight={700} flex={1} noWrap>
          {otherUser?.username || "Chat"}
        </Typography>
        <IconButton onClick={startVoiceCall} color="primary">
          <Call />
        </IconButton>
        <IconButton onClick={startVideoCall} color="primary">
          <Videocam />
        </IconButton>
      </Box>

      <Box flex={1} overflow="auto" px={1.5} py={1}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          messages.map((m) => {
            const mid = m.id || m._id;
            const senderId = String(m.sender_id || m.senderId || "");
            const mine = senderId === myId;
            const mediaUrl = m.media_url || m.media?.url;
            const mediaType = m.media_type || m.media?.type || "";
            return (
              <Box
                key={mid}
                display="flex"
                justifyContent={mine ? "flex-end" : "flex-start"}
                mb={1}
              >
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: "78%",
                    px: 1.5,
                    py: 1,
                    borderRadius: 3,
                    bgcolor: mine ? "primary.main" : "action.hover",
                    color: mine ? "#fff" : "text.primary",
                  }}
                >
                  {mediaUrl && String(mediaType).startsWith("audio") ? (
                    <audio controls src={mediaSrc(mediaUrl)} style={{ maxWidth: 220 }} />
                  ) : mediaUrl && String(mediaType).startsWith("image") ? (
                    <img
                      src={mediaSrc(mediaUrl)}
                      alt=""
                      style={{ maxWidth: 220, borderRadius: 8, display: "block" }}
                    />
                  ) : mediaUrl && String(mediaType).startsWith("video") ? (
                    <video
                      controls
                      src={mediaSrc(mediaUrl)}
                      style={{ maxWidth: 220, borderRadius: 8, display: "block" }}
                    />
                  ) : (
                    <Typography variant="body2">{m.text}</Typography>
                  )}
                </Paper>
              </Box>
            );
          })
        )}
        <div ref={bottomRef} />
      </Box>

      <Box
        display="flex"
        alignItems="center"
        gap={1}
        p={1.5}
        borderTop="1px solid"
        borderColor="divider"
        flexWrap="wrap"
      >
        <IconButton component="label" disabled={sending}>
          <ImageIcon />
          <input
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendImage(f);
              e.target.value = "";
            }}
          />
        </IconButton>

        <TextField
          fullWidth
          size="small"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          sx={{ flex: 1, minWidth: 140, "& .MuiOutlinedInput-root": { borderRadius: 5 } }}
        />

        {text.trim() ? (
          <IconButton color="primary" onClick={handleSend} disabled={sending}>
            <Send />
          </IconButton>
        ) : recording ? (
          <>
            <IconButton color="error" onClick={stopRecording}>
              <Stop />
            </IconButton>
            <Button
              size="small"
              variant="contained"
              onClick={onSendVoiceClick}
              disabled={sending}
            >
              Send
            </Button>
          </>
        ) : pendingVoice ? (
          <Button
            size="small"
            variant="contained"
            startIcon={<Send />}
            onClick={() => sendVoice(pendingVoice)}
            disabled={sending}
          >
            Send voice
          </Button>
        ) : (
          <IconButton color="primary" onClick={startRecording}>
            <Mic />
          </IconButton>
        )}
      </Box>

      <VoiceCall
        open={callOpen}
        mode={callMode}
        targetUser={callTarget}
        isCaller={isCaller}
        incomingPayload={incoming}
        onClose={() => {
          setCallOpen(false);
          setIncoming(null);
        }}
      />
    </Box>
  );
}

export default Chat;