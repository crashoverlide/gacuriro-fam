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

function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({
        username,
        password,
        fullName,
        birthday,
        location,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={2}
      sx={{
        background:
          "linear-gradient(160deg, #0a0a0a 0%, #1a0a2e 50%, #0a0a0a 100%)",
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 3,
          borderRadius: 3,
          bgcolor: "#111",
          color: "#fff",
        }}
      >
        <Typography
          fontWeight={800}
          fontSize={28}
          textAlign="center"
          mb={1}
          sx={{ color: "#ff4d9e" }}
        >
          Gacuriro Fam
        </Typography>
        <Typography textAlign="center" color="#aaa" mb={3}>
          Create account
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
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            required
            fullWidth
            InputLabelProps={{ style: { color: "#ccc" } }}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1a3a5c",
                borderRadius: 3,
              },
            }}
          />
          <TextField
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
            InputLabelProps={{ style: { color: "#ccc" } }}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1a3a5c",
                borderRadius: 3,
              },
            }}
          />
          <TextField
            label="Date of birth"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true, style: { color: "#ccc" } }}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1a3a5c",
                borderRadius: 3,
              },
            }}
          />
          <TextField
            label="City / Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            fullWidth
            InputLabelProps={{ style: { color: "#ccc" } }}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1a3a5c",
                borderRadius: 3,
              },
            }}
          />
          <TextField
            label="Password (min 6)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            inputProps={{ minLength: 6 }}
            fullWidth
            InputLabelProps={{ style: { color: "#ccc" } }}
            sx={{
              input: { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                bgcolor: "#1a3a5c",
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
            {busy ? "Creating…" : "Sign up"}
          </Button>
        </Stack>

        <Typography textAlign="center" mt={2} fontSize={14} color="#aaa">
          Have an account?{" "}
          <Link to="/login" style={{ color: "#ff4d9e" }}>
            Log in
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

export default Signup;