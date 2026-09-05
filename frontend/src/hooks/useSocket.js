import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const useSocket = () => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user || !token) return;

    socketRef.current = io(process.env.REACT_APP_API_URL || "http://localhost:5000", {
      auth: { token },
    });

    socketRef.current.emit("join", user._id || user.id);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, token]);

  return socketRef.current;
};

export default useSocket;