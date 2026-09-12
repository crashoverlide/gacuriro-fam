import React, { useEffect, useState } from "react";
import { Box, Button, Typography, IconButton, Paper } from "@mui/material";
import { Close, GetApp } from "@mui/icons-material";

function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("gf_install_dismissed");
    if (dismissed === "1") return;

    const ua = window.navigator.userAgent || "";
    const ios =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIOS(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if (ios && !standalone) {
      setTimeout(() => setShow(true), 2500);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    setShow(false);
    if (outcome === "accepted") {
      localStorage.setItem("gf_install_dismissed", "1");
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("gf_install_dismissed", "1");
  };

  if (!show) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: 72,
        zIndex: 2000,
        p: 1.5,
        borderRadius: 3,
        bgcolor: "#111",
        color: "#fff",
        border: "1px solid #333",
        maxWidth: 420,
        mx: "auto",
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={1}>
        <GetApp sx={{ color: "#ff2d8a", mt: 0.3 }} />
        <Box flex={1}>
          <Typography fontWeight={800} fontSize={14}>
            Install Gacuriro Fam
          </Typography>
          <Typography fontSize={12} color="#aaa" mt={0.3}>
            {isIOS && !deferred
              ? "On iPhone: Share → Add to Home Screen"
              : "Install the app for faster open & full-screen experience"}
          </Typography>
          <Box display="flex" gap={1} mt={1.2}>
            {deferred ? (
              <Button
                size="small"
                variant="contained"
                onClick={install}
                sx={{
                  bgcolor: "#ff2d8a",
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  "&:hover": { bgcolor: "#e0267a" },
                }}
              >
                Install
              </Button>
            ) : null}
            <Button
              size="small"
              onClick={dismiss}
              sx={{ color: "#aaa", textTransform: "none" }}
            >
              Not now
            </Button>
          </Box>
        </Box>
        <IconButton size="small" onClick={dismiss} sx={{ color: "#888" }}>
          <Close fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  );
}

export default InstallPrompt;