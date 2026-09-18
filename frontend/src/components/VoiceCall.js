import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  CallEnd,
  Call,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeUp,
} from "@mui/icons-material";
import { getSocket } from "../utils/socket";
import { mediaUrl } from "../utils/api";

const ICE = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Simple generated ringtone (no external file needed)
function createRingtone() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return { start: () => {}, stop: () => {} };

  let ctx = null;
  let timer = null;
  let stopped = true;

  const beep = () => {
    if (stopped || !ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.35);
  };

  return {
    start() {
      stopped = false;
      ctx = new AudioCtx();
      beep();
      timer = setInterval(beep, 1200);
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      try {
        ctx?.close();
      } catch (e) {}
      ctx = null;
    },
  };
}

function VoiceCall({
  open,
  onClose,
  mode = "audio", // "audio" | "video"
  isCaller = false,
  targetUserId,
  targetName = "User",
  targetAvatar = "",
  meId,
  incomingPayload = null,
}) {
  const [status, setStatus] = useState(isCaller ? "calling" : "incoming");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [error, setError] = useState("");

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneRef = useRef(null);
  const politeRef = useRef(!isCaller);

  const stopRingtone = () => {
    try {
      ringtoneRef.current?.stop();
    } catch (e) {}
    ringtoneRef.current = null;
  };

  const cleanup = useCallback(() => {
    stopRingtone();
    try {
      localStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch (e) {}
    localStreamRef.current = null;
    try {
      pcRef.current?.close();
    } catch (e) {}
    pcRef.current = null;
  }, []);

  const endCall = useCallback(
    (notify = true) => {
      const sock = getSocket();
      if (notify && sock && targetUserId) {
        sock.emit("call:end", { to: String(targetUserId) });
      }
      cleanup();
      setStatus("ended");
      onClose && onClose();
    },
    [cleanup, onClose, targetUserId]
  );

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(ICE);
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const sock = getSocket();
      if (sock && targetUserId) {
        sock.emit("call:signal", {
          to: String(targetUserId),
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
      stopRingtone();
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "connected") {
        setStatus("connected");
        stopRingtone();
      }
      if (s === "failed" || s === "disconnected" || s === "closed") {
        if (s === "failed") setError("Connection failed");
      }
    };

    return pc;
  }, [targetUserId]);

  const getMedia = async () => {
    const constraints =
      mode === "video"
        ? { audio: true, video: { facingMode: "user", width: { ideal: 640 } } }
        : { audio: true, video: false };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;

    if (localVideoRef.current && mode === "video") {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      localVideoRef.current.play().catch(() => {});
    }
    return stream;
  };

  const startAsCaller = async () => {
    try {
      setStatus("calling");
      ringtoneRef.current = createRingtone();
      ringtoneRef.current.start();

      const stream = await getMedia();
      const pc = ensurePc();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sock = getSocket();
      if (!sock?.connected) {
        setError("Not connected to server. Wait and try again.");
        stopRingtone();
        return;
      }

      sock.emit("call:invite", {
        to: [String(targetUserId)],
        mode,
        fromName: "You",
        sdp: offer,
      });

      sock.emit("call:signal", {
        to: String(targetUserId),
        sdp: offer,
      });
    } catch (e) {
      console.error(e);
      setError(e.message || "Mic/camera permission denied");
      stopRingtone();
    }
  };

  const acceptIncoming = async () => {
    try {
      stopRingtone();
      setStatus("connecting");
      const stream = await getMedia();
      const pc = ensurePc();
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const remoteSdp = incomingPayload?.sdp;
      if (remoteSdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(remoteSdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const sock = getSocket();
        sock?.emit("call:signal", {
          to: String(targetUserId),
          sdp: answer,
        });
      }
      setStatus("connected");
    } catch (e) {
      console.error(e);
      setError(e.message || "Could not answer");
    }
  };

  useEffect(() => {
    if (!open) return;

    const sock = getSocket();
    if (!sock) {
      setError("Socket not ready");
      return;
    }

    if (!isCaller) {
      ringtoneRef.current = createRingtone();
      ringtoneRef.current.start();
    } else {
      startAsCaller();
    }

    const onSignal = async (payload) => {
      if (!payload) return;
      if (String(payload.from) !== String(targetUserId) && payload.from) {
        // still accept if we are in this call UI
      }
      try {
        const pc = ensurePc();
        if (payload.sdp) {
          const desc = payload.sdp;
          if (desc.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(desc));
            if (!localStreamRef.current) {
              const stream = await getMedia();
              stream.getTracks().forEach((t) => pc.addTrack(t, stream));
            }
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sock.emit("call:signal", {
              to: String(targetUserId || payload.from),
              sdp: answer,
            });
            setStatus("connected");
            stopRingtone();
          } else if (desc.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(desc));
            setStatus("connected");
            stopRingtone();
          }
        }
        if (payload.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } catch (e) {}
        }
      } catch (e) {
        console.error("signal error", e);
      }
    };

    const onEnd = () => {
      cleanup();
      setStatus("ended");
      onClose && onClose();
    };

    const onUnavailable = () => {
      setError("User offline");
      stopRingtone();
      setStatus("failed");
    };

    sock.on("call:signal", onSignal);
    sock.on("call:end", onEnd);
    sock.on("call:unavailable", onUnavailable);

    return () => {
      sock.off("call:signal", onSignal);
      sock.off("call:end", onEnd);
      sock.off("call:unavailable", onUnavailable);
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isCaller, targetUserId]);

  if (!open) return null;

  const avatarSrc = targetAvatar
    ? targetAvatar.startsWith("http")
      ? targetAvatar
      : mediaUrl(targetAvatar)
    : undefined;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 20000,
        bgcolor: "#0b0b0f",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {mode === "video" && (
        <Box sx={{ position: "absolute", inset: 0 }}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "absolute",
              width: 110,
              height: 160,
              right: 12,
              top: 12,
              objectFit: "cover",
              borderRadius: 12,
              background: "#222",
            }}
          />
        </Box>
      )}

      <Avatar src={avatarSrc} sx={{ width: 96, height: 96, mb: 2, zIndex: 1 }} />
      <Typography fontWeight={800} fontSize={22} zIndex={1}>
        {targetName}
      </Typography>
      <Typography color="#aaa" mb={1} zIndex={1}>
        {status === "calling" && "Calling…"}
        {status === "incoming" && "Incoming call…"}
        {status === "connecting" && "Connecting…"}
        {status === "connected" && (mode === "video" ? "Video connected" : "Connected")}
        {status === "failed" && "Failed"}
        {status === "ended" && "Ended"}
      </Typography>
      {error && (
        <Typography color="#ff6b6b" fontSize={13} mb={2} zIndex={1}>
          {error}
        </Typography>
      )}
      {(status === "calling" || status === "connecting") && (
        <CircularProgress size={22} sx={{ color: "#ff2d8a", mb: 2, zIndex: 1 }} />
      )}

      <Box display="flex" gap={2} mt={3} zIndex={1}>
        {status === "incoming" && (
          <IconButton
            onClick={acceptIncoming}
            sx={{ bgcolor: "#22c55e", color: "#fff", width: 64, height: 64 }}
          >
            <Call />
          </IconButton>
        )}

        <IconButton
          onClick={() => {
            const stream = localStreamRef.current;
            stream?.getAudioTracks()?.forEach((t) => {
              t.enabled = muted;
            });
            setMuted((m) => !m);
          }}
          sx={{ bgcolor: "#333", color: "#fff", width: 56, height: 56 }}
        >
          {muted ? <MicOff /> : <Mic />}
        </IconButton>

        {mode === "video" && (
          <IconButton
            onClick={() => {
              const stream = localStreamRef.current;
              stream?.getVideoTracks()?.forEach((t) => {
                t.enabled = camOff;
              });
              setCamOff((v) => !v);
            }}
            sx={{ bgcolor: "#333", color: "#fff", width: 56, height: 56 }}
          >
            {camOff ? <VideocamOff /> : <Videocam />}
          </IconButton>
        )}

        <IconButton
          onClick={() => endCall(true)}
          sx={{ bgcolor: "#ef4444", color: "#fff", width: 64, height: 64 }}
        >
          <CallEnd />
        </IconButton>
      </Box>

      <Box display="flex" alignItems="center" gap={0.5} mt={2} zIndex={1} color="#888">
        <VolumeUp fontSize="small" />
        <Typography fontSize={12}>Speaker on</Typography>
      </Box>
    </Box>
  );
}

export default VoiceCall;