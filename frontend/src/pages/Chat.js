import React, { useEffect, useState, useRef, useCallback } from "react";
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
  Tabs,
  Tab,
  CircularProgress,
  InputAdornment,
  Paper,
  Badge,
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
import { API_URL, mediaUrl } from "../utils/api";
import { getSocket, connectSocket } from "../utils/socket";
import VoiceCall from "../components/VoiceCall";
import { formatDistanceToNow } from "date-fns";

function Chat() {
  const { conversationId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [search, setSearch] = useState("");
  const [peer, setPeer] = useState(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callMode, setCallMode] = useState("audio");
  const [incomingCall, setIncomingCall] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const bottomRef = useRef(null);
  const recordTimerRef = useRef(null);
  const fileRef = useRef(null);

  const myId = String(user?.id || user?._id || "");

  const authHeaders = useCallback(() => {
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  const scrollBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  // Keep socket online
  useEffect(() => {
    if (myId) connectSocket(myId);
  }, [myId]);

  // Load conversations list
  useEffect(() => {
    if (!token || conversationId) return;
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/messages/conversations`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => ({}));
        if (!dead && res.ok) {
          setConversations(data.conversations || data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [token, conversationId, authHeaders]);

  // Load thread
  useEffect(() => {
    if (!token || !conversationId) return;
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/messages/conversations/${conversationId}`,
          { headers: authHeaders() }
        );
        const data = await res.json().catch(() => ({}));
        if (dead) return;
        if (res.ok) {
          setMessages(data.messages || []);
          const other =
            data.peer ||
            data.otherUser ||
            (data.members || []).find(
              (m) => String(m.id || m._id) !== myId
            ) ||
            null;
          setPeer(other);
          scrollBottom();
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => {
      dead = true;
    };
  }, [token, conversationId, authHeaders, myId]);

  // Realtime messages + incoming calls
  useEffect(() => {
    const sock = getSocket();
    if (!sock) return;

    const onMsg = (payload) => {
      if (!payload) return;
      const cid = String(payload.conversationId || payload.conversation_id || "");
      if (conversationId && cid === String(conversationId)) {
        setMessages((prev) => {
          if (prev.some((m) => String(m.id || m._id) === String(payload.id || payload._id))) {
            return prev;
          }
          return [...prev, payload];
        });
        scrollBottom();
      }
      // refresh list preview
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id || c._id) === cid
            ? {
                ...c,
                last_message: payload.text || (payload.media_type === "audio" ? "Voice note" : "Media"),
                updated_at: payload.created_at || new Date().toISOString(),
              }
            : c
        )
      );
    };

    const onIncoming = (payload) => {
      setIncomingCall(payload);
      setCallMode(payload?.mode === "video" ? "video" : "audio");
      setCallOpen(true);
    };

    sock.on("message:new", onMsg);
    sock.on("call:incoming", onIncoming);
    return () => {
      sock.off("message:new", onMsg);
      sock.off("call:incoming", onIncoming);
    };
  }, [conversationId]);

  const handleSend = async () => {
    const body = text.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          text: body,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        scrollBottom();
        getSocket()?.emit("message:new", {
          ...data.message,
          conversationId,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (file, typeHint) => {
    if (!file || !conversationId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("media", file);
      fd.append("conversationId", conversationId);
      if (typeHint) fd.append("mediaType", typeHint);

      const res = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        scrollBottom();
        getSocket()?.emit("message:new", {
          ...data.message,
          conversationId,
        });
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
      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data?.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        setRecordSecs(0);
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 500) return;
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: mime });
        await sendMedia(file, "audio");
      };
      rec.start(200);
      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => s + 1);
      }, 1000);
    } catch (e) {
      alert("Microphone permission required for voice notes");
    }
  };

  const stopRecording = () => {
    setRecording(false);
    try {
      mediaRecorderRef.current?.stop();
    } catch (e) {}
  };

  const openCall = (mode) => {
    if (!peer) return;
    setIncomingCall(null);
    setCallMode(mode);
    setCallOpen(true);
  };

  const avatarOf = (u) => {
    const a = u?.avatar || u?.avatarUrl || "";
    return a ? mediaUrl(a) : undefined;
  };

  // ——— Conversation list ———
  if (!conversationId) {
    const filtered = conversations.filter((c) => {
      const name = (
        c.peer?.username ||
        c.otherUser?.username ||
        c.group_name ||
        ""
      ).toLowerCase();
      return !search || name.includes(search.toLowerCase());
    });

    return (
      <Box sx={{ maxWidth: 640, mx: "auto", height: "100%", display: "flex", flexDirection: "column" }}>
        <Box px={2} pt={2} pb={1}>
          <Typography fontWeight={800} fontSize={22}>
            Messages
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mt: 1.5, mb: 1, "& .MuiOutlinedInput-root": { borderRadius: 5 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
            <Tab label="Primary" />
            <Tab label="General" />
            <Tab label="Requests" />
          </Tabs>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <List sx={{ flex: 1, overflow: "auto" }}>
            {filtered.map((c) => {
              const id = c.id || c._id;
              const other = c.peer || c.otherUser || {};
              const title = c.group_name || other.username || other.fullName || "Chat";
              return (
                <ListItem
                  key={id}
                  button
                  onClick={() => navigate(`/messages/${id}`)}
                  sx={{ borderRadius: 2, mx: 1 }}
                >
                  <ListItemAvatar>
                    <Avatar src={avatarOf(other)}>{(title || "?")[0]?.toUpperCase()}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography fontWeight={700} fontSize={15}>
                        {title}
                      </Typography>
                    }
                    secondary={
                      <Typography fontSize={13} color="text.secondary" noWrap>
                        {c.last_message || "Say hi"}
                      </Typography>
                    }
                  />
                </ListItem>
              );
            })}
            {!filtered.length && (
              <Typography textAlign="center" color="text.secondary" py={4}>
                No conversations yet
              </Typography>
            )}
          </List>
        )}
      </Box>
    );
  }

  // ——— Thread ———
  const peerName = peer?.username || peer?.fullName || "User";

  return (
    <Box
      sx={{
        maxWidth: 720,
        mx: "auto",
        height: "calc(100vh - 56px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fafafa",
      }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        px={1}
        py={1}
        borderBottom="1px solid #eee"
        bgcolor="#fff"
      >
        <IconButton onClick={() => navigate("/messages")}>
          <ArrowBack />
        </IconButton>
        <Avatar
          src={avatarOf(peer)}
          component={Link}
          to={peer?.username ? `/${peer.username}` : "#"}
          sx={{ width: 36, height: 36 }}
        >
          {(peerName || "?")[0]?.toUpperCase()}
        </Avatar>
        <Box flex={1} component={Link} to={peer?.username ? `/${peer.username}` : "#"} sx={{ textDecoration: "none", color: "inherit" }}>
          <Typography fontWeight={800} fontSize={15}>
            {peerName}
          </Typography>
        </Box>
        <IconButton color="primary" onClick={() => openCall("audio")} title="Voice call">
          <Call />
        </IconButton>
        <IconButton color="primary" onClick={() => openCall("video")} title="Video call">
          <Videocam />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box flex={1} overflow="auto" px={1.5} py={1}>
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        )}
        {messages.map((m) => {
          const mid = m.id || m._id;
          const senderId = String(m.sender_id || m.senderId || m.user_id || m.sender?._id || "");
          const mine = senderId === myId;
          const sender = m.sender || (mine ? user : peer) || {};
          const media = m.media_url || m.media?.url || "";
          const mtype = m.media_type || m.media?.type || "";
          const isAudio =
            mtype.includes("audio") ||
            (media && /\.(webm|mp3|ogg|m4a|wav)$/i.test(media));
          const isImage =
            mtype.includes("image") ||
            (media && /\.(jpg|jpeg|png|gif|webp)$/i.test(media));

          return (
            <Box
              key={mid}
              display="flex"
              justifyContent={mine ? "flex-end" : "flex-start"}
              alignItems="flex-end"
              gap={1}
              mb={1.2}
            >
              {!mine && (
                <Avatar
                  src={avatarOf(sender)}
                  sx={{ width: 28, height: 28 }}
                  component={Link}
                  to={sender?.username ? `/${sender.username}` : "#"}
                >
                  {(sender?.username || "?")[0]?.toUpperCase()}
                </Avatar>
              )}
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 1,
                  maxWidth: "75%",
                  borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  bgcolor: mine ? "#6C4DF6" : "#efefef",
                  color: mine ? "#fff" : "#111",
                }}
              >
                {isAudio && media ? (
                  <audio
                    controls
                    preload="metadata"
                    src={mediaUrl(media)}
                    style={{ maxWidth: 220, height: 36 }}
                  />
                ) : isImage && media ? (
                  <img
                    src={mediaUrl(media)}
                    alt=""
                    style={{ maxWidth: 220, borderRadius: 10, display: "block" }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </Typography>
                )}
                <Typography
                  sx={{
                    fontSize: 10,
                    opacity: 0.7,
                    mt: 0.4,
                    textAlign: "right",
                  }}
                >
                  {m.created_at
                    ? formatDistanceToNow(new Date(m.created_at), { addSuffix: true })
                    : ""}
                </Typography>
              </Paper>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Box
        display="flex"
        alignItems="center"
        gap={0.5}
        p={1.2}
        borderTop="1px solid #eee"
        bgcolor="#fff"
      >
        <IconButton component="label" disabled={sending}>
          <ImageIcon />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) sendMedia(f);
              e.target.value = "";
            }}
          />
        </IconButton>

        {recording ? (
          <Box flex={1} display="flex" alignItems="center" gap={1} px={1}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: "error.main",
              }}
            />
            <Typography fontSize={14} color="error.main" fontWeight={700}>
              Recording {recordSecs}s — tap stop to send
            </Typography>
          </Box>
        ) : (
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 5 } }}
          />
        )}

        {text.trim() ? (
          <IconButton color="primary" onClick={handleSend} disabled={sending}>
            <Send />
          </IconButton>
        ) : (
          <IconButton
            color={recording ? "error" : "primary"}
            onClick={recording ? stopRecording : startRecording}
            disabled={sending}
          >
            {recording ? <Stop /> : <Mic />}
          </IconButton>
        )}
      </Box>

      {/* Calls */}
      <VoiceCall
        open={callOpen}
        onClose={() => {
          setCallOpen(false);
          setIncomingCall(null);
        }}
        mode={callMode}
        isCaller={!incomingCall}
        targetUserId={
          incomingCall?.from || peer?.id || peer?._id
        }
        targetName={
          incomingCall?.fromName || peerName
        }
        targetAvatar={peer?.avatar}
        meId={myId}
        incomingPayload={incomingCall}
      />
    </Box>
  );
}

export default Chat;