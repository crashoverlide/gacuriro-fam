import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Typography, TextField, Button } from "@mui/material";

function Location() {
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate("/home");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card sx={{ p: 4, boxShadow: 4, borderRadius: 3 }}>
        <Typography variant="h5" align="center" sx={{ mb: 3 }}>
          Location
        </Typography>
        <TextField label="City" fullWidth margin="normal"
          value={location} onChange={(e) => setLocation(e.target.value)} />
        <Button onClick={handleFinish} variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Finish
        </Button>
      </Card>
    </Container>
  );
}

export default Location;
