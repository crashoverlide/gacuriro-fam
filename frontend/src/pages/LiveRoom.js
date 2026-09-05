import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Avatar,
  Stack,
  Alert,
} from "@mui/material";
import {
  ArrowBack,
  CallEnd,
  Cameraswitch,
  FiberManualRecord,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import { connectSocket, getSocket } from "../utils/socket";

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function LiveRoom() {
  const { sessionId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [localOn, setLocalOn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const startingLock = useRef(false);
  const mountedRef = useRef(true);

  const myId = String(user?._id || user?.id || "");
  const isHost = session && String(session.hostId) === myId;

  // Keep video element attached whenever stream exists (survives re-renders)
  const attachStream = useCallback(() => {
    const videoEl = localVideoRef.current;
    const stream = localStreamRef.current;
    if (!videoEl || !stream) return;

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.setAttribute("playsinline", "true");

    const play = async () => {
      try {
        await videoEl.play();
      } catch (e) {
        console.warn("video.play()", e);
      }
    };
    play();
  }, []);

  const stopMyCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    setLocalOn(false);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/live/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to load session");
      if (!mountedRef.current) return;
      setSession(data.session);
      setCameras(data.cameras || []);
      const main =
        (data.cameras || []).find((c) => c.isMain && c.status === "live") ||
        (data.cameras || []).find((c) => c.status === "live");
      if (main) setActiveCameraId(main.id);
    } catch (e) {
      if (mountedRef.current) setError(e.message);
    }
  }, [sessionId, token]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !sessionId) return;
    setLoading(true);
    load().finally(() => {
      if (mountedRef.current) setLoading(false);
    });
  }, [token, sessionId, load]);

  useEffect(() => {
    if (!myId || !sessionId) return;
    const sock = connectSocket(myId);
    if (!sock) return;

    sock.emit("live:join", { sessionId, userId: myId });

    const onUpdate = () => {
      load();
    };
    sock.on("live:camera-update", onUpdate);
    sock.on("live:peer-joined", onUpdate);

    return () => {
      sock.emit("live:leave", { sessionId });
      sock.off("live:camera-update", onUpdate);
      sock.off("live:peer-joined", onUpdate);
    };
  }, [myId, sessionId, load]);

  // Re-attach after every render if we still have a live stream
  useEffect(() => {
    if (localOn) attachStream();
  }, [localOn, attachStream, session, cameras]);

  // Stop camera only when leaving the page (not on Strict Mode soft remount race)
  useEffect(() => {
    return () => {
      // small delay so Strict Mode remount can reclaim — actually just stop on unmount
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  const startMyCamera = async () => {
    if (startingLock.current) return;
    startingLock.current = true;
    setError("");
    setStarting(true);

    try {
      // If already running, just re-attach (don't open camera again)
      if (localStreamRef.current) {
        const live = localStreamRef.current
          .getVideoTracks()
          .some((t) => t.readyState === "live");
        if (live) {
          setLocalOn(true);
          attachStream();
          return;
        }
        stopMyCamera();
      }

      // ONE call only — video first (stable). No retry loop (loop causes AbortError).
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      // Optional mic — separate, never kills video if it fails
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch (_) {
        console.warn("Mic skipped");
      }

      localStreamRef.current = stream;
      setLocalOn(true);

      // Attach after state update tick
      requestAnimationFrame(() => {
        attachStream();
      });

      // Register camera on server (do not stop local stream if this fails)
      try {
        await fetch(`${API_URL}/api/live/${sessionId}/cameras`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            label: isHost ? "Host" : `${user?.username || "User"} cam`,
          }),
        });
        await load();
        getSocket()?.emit("live:camera-update", { sessionId });
      } catch (apiErr) {
        console.warn("camera register", apiErr);
      }
    } catch (e) {
      console.error(e);
      stopMyCamera();
      let msg = "Could not start camera";
      if (e?.name === "NotAllowedError") {
        msg = "Allow camera permission and try again";
      } else if (e?.name === "NotReadableError") {
        msg = "Camera busy — close other apps/tabs using it";
      } else if (e?.name === "AbortError") {
        msg = "Camera interrupted — click Start once more";
      } else if (e?.message) {
        msg = e.message;
      }
      setError(msg);
    } finally {
      setStarting(false);
      startingLock.current = false;
    }
  };

  const approveCamera = async (cameraId) => {
    await fetch(
      `${API_URL}/api/live/${sessionId}/cameras/${cameraId}/approve`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
    );
    await load();
    getSocket()?.emit("live:camera-update", { sessionId });
  };

  const setMain = async (cameraId) => {
    setActiveCameraId(cameraId);
    await fetch(`${API_URL}/api/live/${sessionId}/cameras/${cameraId}/main`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
    getSocket()?.emit("live:camera-update", { sessionId });
  };

  const endLive = async () => {
    stopMyCamera();
    await fetch(`${API_URL}/api/live/${sessionId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    navigate("/live");
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#000"
      >
        <CircularProgress sx={{ color: "#ff2d8a" }} />
      </Box>
    );
  }

  if (!session) {
    return (
      <Box p={3} bgcolor="#000" color="#fff" minHeight="100vh">
        <Typography>{error || "Session not found"}</Typography>
        <Button onClick={() => navigate("/live")} sx={{ mt: 2, color: "#fff" }}>
          Back
        </Button>
      </Box>
    );
  }

  const liveCams = cameras.filter((c) => c.status === "live");
  const pendingCams = cameras.filter((c) => c.status === "pending");

  return (
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        minHeight: "100vh",
        bgcolor: "#000",
        color: "#fff",
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
        position="absolute"
        top={0}
        left={0}
        right={0}
        zIndex={10}
        sx={{ background: "linear-gradient(rgba(0,0,0,0.75), transparent)" }}
      >
        <IconButton
          sx={{ color: "#fff" }}
          onClick={() => {
            stopMyCamera();
            navigate("/live");
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box flex={1}>
          <Typography fontWeight={800} fontSize={14} noWrap>
            {session.title}
          </Typography>
          <Chip
            size="small"
            icon={
              <FiberManualRecord
                sx={{ fontSize: "12px !important", color: "#fff" }}
              />
            }
            label="LIVE"
            sx={{ height: 20, bgcolor: "#e11d48", color: "#fff", fontSize: 11 }}
          />
        </Box>
        {isHost && (
          <Button
            size="small"
            color="error"
            variant="contained"
            startIcon={<CallEnd />}
            onClick={endLive}
          >
            End
          </Button>
        )}
      </Box>

      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="55vh"
        bgcolor="#111"
        pt={6}
        position="relative"
      >
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            maxHeight: "70vh",
            objectFit: "cover",
            background: "#000",
            display: localOn ? "block" : "none",
          }}
        />

        {!localOn && (
          <Box textAlign="center" px={3}>
            <Cameraswitch sx={{ fontSize: 48, color: "#555", mb: 1 }} />
            <Typography color="#888" fontSize={14} mb={2}>
              {isHost
                ? "Start your host camera to go live"
                : "Join with your camera"}
            </Typography>
            {error ? (
              <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                {error}
              </Alert>
            ) : null}
            <Button
              variant="contained"
              onClick={startMyCamera}
              disabled={starting}
              sx={{ bgcolor: "#ff2d8a", "&:hover": { bgcolor: "#e0267a" } }}
            >
              {starting
                ? "Starting…"
                : isHost
                ? "Start host camera"
                : "Add my camera"}
            </Button>
          </Box>
        )}
      </Box>

      <Box px={2} py={1.5} borderTop="1px solid #222">
        <Typography fontSize={12} color="#888" mb={1}>
          PERSPECTIVES ({liveCams.length})
        </Typography>
        <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
          {liveCams.map((c) => (
            <Chip
              key={c.id}
              avatar={
                <Avatar src={mediaSrc(c.user?.avatar)}>
                  {(c.user?.username || "U")[0]}
                </Avatar>
              }
              label={c.label || c.user?.username || "Cam"}
              onClick={() => setMain(c.id)}
              sx={{
                bgcolor: activeCameraId === c.id ? "#ff2d8a" : "#222",
                color: "#fff",
              }}
            />
          ))}
        </Stack>

        {isHost &&
          pendingCams.map((c) => (
            <Box
              key={c.id}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mt={1}
            >
              <Typography fontSize={13}>@{c.user?.username || "user"}</Typography>
              <Button size="small" onClick={() => approveCamera(c.id)}>
                Approve
              </Button>
            </Box>
          ))}

        {localOn && (
          <Button
            fullWidth
            size="small"
            variant="outlined"
            onClick={stopMyCamera}
            sx={{ mt: 1, color: "#fff", borderColor: "#333" }}
          >
            Stop my camera
          </Button>
        )}
      </Box>
    </Box>
  );
}

export default LiveRoom;