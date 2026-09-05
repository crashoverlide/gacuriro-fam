import { useEffect, useState } from "react";
import { getSocket } from "../utils/socket";
import { mediaUrl } from "../utils/api";

export default function IncomingCallModal({ onAccept, onReject }) {
  const [incoming, setIncoming] = useState(null);

  useEffect(() => {
    const socket = getSocket();

    const handleIncoming = (data) => {
      console.log("Incoming call:", data);
      setIncoming(data);
    };

    const handleEnded = () => setIncoming(null);
    const handleRejected = () => setIncoming(null);

    socket.on("call:incoming", handleIncoming);
    socket.on("call:ended", handleEnded);
    socket.on("call:rejected", handleRejected);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:ended", handleEnded);
      socket.off("call:rejected", handleRejected);
    };
  }, []);

  if (!incoming) return null;

  const { fromUser, callType, fromUserId, offer } = incoming;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center">
      <div className="bg-gray-900 rounded-3xl p-8 w-80 text-center text-white shadow-2xl">
        <img
          src={mediaUrl(fromUser?.avatar) || "/default-avatar.png"}
          alt=""
          className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
        />
        <h2 className="text-xl font-semibold">{fromUser?.name || "Unknown"}</h2>
        <p className="text-gray-400 mt-1">
          Incoming {callType === "video" ? "Video" : "Voice"} Call…
        </p>

        {/* Buttons – you can replace with swipe gesture later */}
        <div className="flex justify-center gap-10 mt-10">
          {/* Reject */}
          <button
            onClick={() => {
              getSocket().emit("call:reject", { toUserId: fromUserId });
              setIncoming(null);
              onReject?.(incoming);
            }}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-2xl"
          >
            ✕
          </button>

          {/* Accept / Swipe area */}
          <button
            onClick={() => {
              setIncoming(null);
              onAccept?.(incoming); // your WebRTC accept logic goes here
            }}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-2xl"
          >
            ✓
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          Swipe right or tap green to answer
        </p>
      </div>
    </div>
  );
}