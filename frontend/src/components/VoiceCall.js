import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  Button,
  Stack,
} from "@mui/material";
import {
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  Call,
} from "@mui/icons-material";
import { getSocket, connectSocket } from "../utils/socket";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function mediaSrc(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Props:
 * - open: boolean
 * - mode: "voice" | "video"
 * - targetUser: { id, _id, username, avatar, fullName }
 * - isCaller: boolean (you started the call)
 * - incomingPayload: object from socket (when receiving)
 * - onClose: () => void
 */
export default function VoiceCall({
  open,
  mode = "voice",
  targetUser,
  isCaller = false,
  incomingPayload = null,
  onClose,
}) {
  const { user } = useAuth();
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteSocketIdRef = useRef(null);
  const ringAudioRef = useRef(null);

  const [status, setStatus] = useState("idle"); // idle | ringing | connecting | connected | ended
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState("");

  const myId = String(user?._id || user?.id || "");
  const targetId = String(
    targetUser?._id || targetUser?.id || incomingPayload?.fromUserId || ""
  );
  const isVideo = mode === "video" || incomingPayload?.mode === "video";

  const cleanup = useCallback(() => {
    try {
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    } catch (_) {}

    try {
      localStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch (_) {}
    localStreamRef.current = null;

    try {
      pcRef.current?.close();
    } catch (_) {}
    pcRef.current = null;
    remoteSocketIdRef.current = null;
  }, []);

  const stopRing = () => {
    try {
      if (ringAudioRef.current) {
        ringAudioRef.current.pause();
        ringAudioRef.current.currentTime = 0;
      }
    } catch (_) {}
  };

  const playRing = () => {
    try {
      if (!ringAudioRef.current) {
        // simple oscillator ring via Web Audio if no file
        return;
      }
      ringAudioRef.current.loop = true;
      ringAudioRef.current.play().catch(() => {});
    } catch (_) {}
  };

  const createPc = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const sock = getSocket();
      const to = remoteSocketIdRef.current;
      if (sock && to) {
        sock.emit("call:ice", {
          toSocketId: to,
          candidate: e.candidate,
        });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams?.[0];
      if (!stream) return;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
      }
      setStatus("connected");
      stopRing();
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setStatus("connected");
        stopRing();
      }
      if (s === "failed" || s === "disconnected" || s === "closed") {
        setStatus("ended");
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  const getMedia = async (video) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video
        ? {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          }
        : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current && video) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.playsInline = true;
      localVideoRef.current.play().catch(() => {});
    }
    return stream;
  };

  const startCall = useCallback(async () => {
    try {
      setError("");
      setStatus("ringing");
      playRing();

      const sock = connectSocket(myId);
      if (!sock) {
        setError("Socket not ready");
        return;
      }

      const stream = await getMedia(isVideo);
      const pc = createPc();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      sock.emit("call:invite", {
        targetIds: [targetId],
        fromUserId: myId,
        fromUsername: user?.username,
        fromAvatar: user?.avatar,
        mode: isVideo ? "video" : "voice",
      });

      // wait for accept → then create offer (handled in socket listeners)
    } catch (e) {
      console.error(e);
      setError(
        e?.name === "NotAllowedError"
          ? "Microphone/camera permission denied"
          : e.message || "Could not start call"
      );
      setStatus("ended");
      cleanup();
    }
  }, [myId, targetId, isVideo, user, createPc, cleanup]);

  const acceptCall = useCallback(async () => {
    try {
      setError("");
      setStatus("connecting");
      stopRing();

      const sock = connectSocket(myId);
      const fromSocketId = incomingPayload?.fromSocketId;
      if (!sock || !fromSocketId) {
        setError("Caller offline");
        return;
      }
      remoteSocketIdRef.current = fromSocketId;

      const stream = await getMedia(isVideo);
      const pc = createPc();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      sock.emit("call:accept", {
        toSocketId: fromSocketId,
        fromUserId: myId,
      });
    } catch (e) {
      console.error(e);
      setError(
        e?.name === "NotAllowedError"
          ? "Microphone/camera permission denied"
          : e.message || "Accept failed"
      );
      setStatus("ended");
      cleanup();
    }
  }, [myId, incomingPayload, isVideo, createPc, cleanup]);

  const endCall = useCallback(() => {
    const sock = getSocket();
    const to = remoteSocketIdRef.current;
    if (sock && to) {
      sock.emit("call:end", { toSocketId: to });
    }
    cleanup();
    setStatus("ended");
    if (onClose) onClose();
  }, [cleanup, onClose]);

  // Socket signaling
  useEffect(() => {
    if (!open || !myId) return;

    const sock = connectSocket(myId);
    if (!sock) return;

    const onAccepted = async (payload) => {
      try {
        remoteSocketIdRef.current = payload.fromSocketId;
        setStatus("connecting");
        stopRing();

        let pc = pcRef.current;
        if (!pc) {
          const stream = localStreamRef.current || (await getMedia(isVideo));
          pc = createPc();
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sock.emit("call:offer", {
          toSocketId: payload.fromSocketId,
          sdp: offer,
        });
      } catch (e) {
        console.error(e);
        setError("Failed to connect");
      }
    };

    const onOffer = async (payload) => {
      try {
        remoteSocketIdRef.current = payload.fromSocketId;
        let pc = pcRef.current;
        if (!pc) {
          const stream = localStreamRef.current || (await getMedia(isVideo));
          pc = createPc();
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit("call:answer", {
          toSocketId: payload.fromSocketId,
          sdp: answer,
        });
        setStatus("connecting");
      } catch (e) {
        console.error(e);
        setError("Offer failed");
      }
    };

    const onAnswer = async (payload) => {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setStatus("connected");
        stopRing();
      } catch (e) {
        console.error(e);
      }
    };

    const onIce = async (payload) => {
      try {
        const pc = pcRef.current;
        if (!pc || !payload.candidate) return;
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (e) {
        console.error(e);
      }
    };

    const onEnd = () => {
      cleanup();
      setStatus("ended");
      if (onClose) onClose();
    };

    const onError = (p) => {
      setError(p?.message || "Call error");
      setStatus("ended");
      stopRing();
    };

    sock.on("call:accepted", onAccepted);
    sock.on("call:offer", onOffer);
    sock.on("call:answer", onAnswer);
    sock.on("call:ice", onIce);
    sock.on("call:end", onEnd);
    sock.on("call:error", onError);

    return () => {
      sock.off("call:accepted", onAccepted);
      sock.off("call:offer", onOffer);
      sock.off("call:answer", onAnswer);
      sock.off("call:ice", onIce);
      sock.off("call:end", onEnd);
      sock.off("call:error", onError);
    };
  }, [open, myId, isVideo, createPc, cleanup, onClose]);

  // Auto start if caller
  useEffect(() => {
    if (!open) return;
    if (isCaller && status === "idle") {
      startCall();
    } else if (!isCaller && status === "idle") {
      setStatus("ringing");
      playRing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCaller]);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = muted;
    });
    setMuted((m) => !m);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = camOff;
    });
    setCamOff((c) => !c);
  };

  if (!open) return null;

  const displayName =
    targetUser?.username ||
    incomingPayload?.fromUsername ||
    "User";

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        bgcolor: "#0a0a0a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />
      {/* optional: put a ring.mp3 in public/ */}
      <audio ref={ringAudioRef} src="/ring.mp3" preload="auto" />

      {isVideo && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: "#000",
          }}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              width: 110,
              height: 160,
              objectFit: "cover",
              borderRadius: 12,
              border: "2px solid #333",
              background: "#111",
            }}
          />
        </Box>
      )}

      <Stack
        spacing={2}
        alignItems="center"
        sx={{ position: "relative", zIndex: 2, px: 2 }}
      >
        {!isVideo && (
          <Avatar
            src={mediaSrc(targetUser?.avatar || incomingPayload?.fromAvatar)}
            sx={{ width: 96, height: 96, bgcolor: "#333", mb: 1 }}
          >
            {String(displayName)[0]?.toUpperCase()}
          </Avatar>
        )}

        <Typography fontWeight={800} fontSize={22}>
          {displayName}
        </Typography>
        <Typography color="#aaa">
          {status === "ringing" && (isCaller ? "Calling…" : "Incoming call…")}
          {status === "connecting" && "Connecting…"}
          {status === "connected" && (isVideo ? "Video connected" : "Voice connected")}
          {status === "ended" && "Call ended"}
          {status === "idle" && "Starting…"}
        </Typography>

        {error && (
          <Typography color="#ff6b6b" fontSize={14} textAlign="center">
            {error}
          </Typography>
        )}

        <Stack direction="row" spacing={2} mt={3} alignItems="center">
          {!isCaller && status === "ringing" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<Call />}
              onClick={acceptCall}
              sx={{ borderRadius: 8, px: 3 }}
            >
              Accept
            </Button>
          )}

          <IconButton
            onClick={toggleMute}
            sx={{ bgcolor: "#222", color: "#fff", width: 56, height: 56 }}
          >
            {muted ? <MicOff /> : <Mic />}
          </IconButton>

          {isVideo && (
            <IconButton
              onClick={toggleCam}
              sx={{ bgcolor: "#222", color: "#fff", width: 56, height: 56 }}
            >
              {camOff ? <VideocamOff /> : <Videocam />}
            </IconButton>
          )}

          <IconButton
            onClick={endCall}
            sx={{ bgcolor: "#e11d48", color: "#fff", width: 64, height: 64 }}
          >
            <CallEnd />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}