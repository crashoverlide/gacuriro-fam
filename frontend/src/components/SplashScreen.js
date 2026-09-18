import React, { useEffect, useState } from "react";
import { Box, keyframes } from "@mui/material";

const pulse = keyframes`
  0% { transform: scale(0.9); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const fadeOut = keyframes`
  to { opacity: 0; visibility: hidden; }
`;

function SplashScreen({ onDone }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 900);
    const t2 = setTimeout(() => onDone && onDone(), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: hide ? `${fadeOut} 0.3s forwards` : "none",
      }}
    >
      <Box
        sx={{
          width: 84,
          height: 84,
          borderRadius: "22px",
          background: "linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: `${pulse} 0.9s ease-out`,
          color: "#fff",
          fontWeight: 900,
          fontSize: 44,
        }}
      >
        G
      </Box>
    </Box>
  );
}

export default SplashScreen;