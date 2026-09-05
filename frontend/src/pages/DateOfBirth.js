import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Card, Typography, TextField, Button } from "@mui/material";

function DateOfBirth() {
  const [dob, setDob] = useState("");
  const navigate = useNavigate();

  const handleNext = () => {
    navigate("/location");
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Card sx={{ p: 4, boxShadow: 4, borderRadius: 3 }}>
        <Typography variant="h5" align="center" sx={{ mb: 3 }}>
          Date of Birth
        </Typography>
        <TextField type="date" fullWidth margin="normal"
          value={dob} onChange={(e) => setDob(e.target.value)} />
        <Button onClick={handleNext} variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
          Next
        </Button>
      </Card>
    </Container>
  );
}

export default DateOfBirth;
