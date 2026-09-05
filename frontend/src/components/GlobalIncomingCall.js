import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { connectSocket, getSocket } from "../utils/socket";
import VoiceCall from "./VoiceCall";

function GlobalIncomingCall() {
  const { user, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [callType, setCallType] = useState("audio");
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [fromUser, setFromUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (!user?._id || !token) return undefined;

    const s = connectSocket(user._id);

    // Browser notification permission (once)
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const onIncoming = (payload) => {
      setFromUser(payload.fromUser || null);
      setIncomingOffer(payload.offer || null);
      setRemoteSocketId(payload.fromSocketId || null);
      setCallType(payload.callType || "audio");
      setConversationId(payload.conversationId || payload.roomId || null);
      setOpen(true);

      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification("Gacuriro Fam", {
            body: `${payload.fromUser?.username || "Someone"} is calling…`,
            tag: "gf-call",
            requireInteraction: true,
          });
          n.onclick = () => {
            window.focus();
            n.close();
          };
        }
      } catch (e) {}
    };

    s.on("call:incoming", onIncoming);
    return () => {
      s.off("call:incoming", onIncoming);
    };
  }, [user?._id, token]);

  if (!user) return null;

  return (
    <VoiceCall
      open={open}
      mode="incoming"
      callType={callType}
      me={user}
      remoteUser={fromUser || { username: "User" }}
      conversationId={conversationId}
      roomId={conversationId}
      incomingOffer={incomingOffer}
      remoteSocketId={remoteSocketId}
      onClose={() => {
        setOpen(false);
        setIncomingOffer(null);
        setRemoteSocketId(null);
        setFromUser(null);
      }}
    />
  );
}

export default GlobalIncomingCall;