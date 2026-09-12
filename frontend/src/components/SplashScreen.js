import React, { useEffect, useState } from "react";
import { Box, keyframes } from "@mui/material";

const pulse = keyframes`
  0% { transform: scale(0.85); opacity: 0.6; }
  50% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; visibility: hidden; }
`;

function SplashScreen({ onDone }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1400);
    const t2 = setTimeout(() => onDone && onDone(), 1800);
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
        zIndex: 9999,
        bgcolor: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: hide ? `${fadeOut} 0.4s forwards` : "none",
      }}
    >
      <Box
        sx={{
          width: 88,
          height: 88,
          borderRadius: "22px",
          background: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF, #515BD4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: `${pulse} 1.2s ease-out`,
          boxShadow: "0 0 40px rgba(221,42,123,0.45)",
        }}
      >
        <Box
          component="span"
          sx={{
            color: "#fff",
            fontWeight: 900,
            fontSize: 48,
            fontFamily: "Inter, system-ui, sans-serif",
            lineHeight: 1,
          }}
        >
          G
        </Box>
      </Box>
    </Box>
  );
}

export default SplashScreen;