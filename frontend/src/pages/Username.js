import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Typography, TextField, Button } from "@mui/material";

function Username() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleNext = () => {
    // Save username to backend
    navigate("/dob");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card sx={{ p: 4, boxShadow: 4, borderRadius: 3 }}>
        <Typography variant="h5" align="center" sx={{ mb: 3 }}>
          Choose a Username
        </Typography>
        <TextField
          label="Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button onClick={handleNext} variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Next
        </Button>
      </Card>
    </Container>
  );
}

export default Username;
