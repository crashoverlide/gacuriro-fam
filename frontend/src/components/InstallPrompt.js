import React, { useEffect, useState } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { Close, GetApp } from "@mui/icons-material";

function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("gf_install_dismissed") === "1") return;

    const ua = window.navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIos(ios);

    const handler = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (ios) {
      const standalone =
        window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches;
      if (!standalone) setTimeout(() => setShow(true), 2500);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("gf_install_dismissed", "1");
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 72,
        zIndex: 15000,
        bgcolor: "#111",
        color: "#fff",
        borderRadius: 3,
        p: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1,
        boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
      }}
    >
      <GetApp sx={{ color: "#ff2d8a" }} />
      <Box flex={1}>
        <Typography fontWeight={800} fontSize={14}>
          Install Gacuriro Fam
        </Typography>
        <Typography fontSize={12} color="#ccc">
          {isIos
            ? "Share → Add to Home Screen"
            : "Add to home screen for app-like use"}
        </Typography>
      </Box>
      {!isIos && deferred && (
        <Button
          size="small"
          variant="contained"
          onClick={install}
          sx={{ bgcolor: "#ff2d8a", textTransform: "none", fontWeight: 700 }}
        >
          Install
        </Button>
      )}
      <IconButton size="small" onClick={dismiss} sx={{ color: "#aaa" }}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
}

export default InstallPrompt;