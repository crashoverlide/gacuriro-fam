import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Stack,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import CinematicBackground from "../components/CinematicBackground";

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ username, password });
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box minHeight="100vh" position="relative" overflow="hidden">
      <CinematicBackground />

      <Box
        position="relative"
        zIndex={1}
        minHeight="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
        px={2}
      >
        <Box
          component="form"
          onSubmit={onSubmit}
          sx={{
            width: "100%",
            maxWidth: 400,
            p: 3,
            borderRadius: 3,
            bgcolor: "rgba(17,17,17,0.82)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,77,158,0.25)",
            color: "#fff",
            boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
          }}
        >
          <Typography
            fontWeight={800}
            fontSize={28}
            textAlign="center"
            mb={0.5}
            sx={{
              background: "linear-gradient(90deg,#ff4d9e,#a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Gacuriro Fam
          </Typography>
          <Typography textAlign="center" color="#aaa" mb={3}>
            Log in
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ style: { color: "#ccc" } }}
              sx={{
                input: { color: "#fff" },
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(26,58,92,0.65)",
                  borderRadius: 3,
                },
              }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ style: { color: "#ccc" } }}
              sx={{
                input: { color: "#fff" },
                "& .MuiOutlinedInput-root": {
                  bgcolor: "rgba(26,58,92,0.65)",
                  borderRadius: 3,
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              disabled={busy}
              sx={{
                bgcolor: "#ff2d8a",
                color: "#fff",
                fontWeight: 700,
                py: 1.2,
                borderRadius: 3,
                "&:hover": { bgcolor: "#e0267a" },
              }}
            >
              {busy ? "Please wait…" : "Log in"}
            </Button>
          </Stack>

          <Typography textAlign="center" mt={2} fontSize={14} color="#aaa">
            No account?{" "}
            <Link to="/register" style={{ color: "#ff4d9e" }}>
              Sign up
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default Login;