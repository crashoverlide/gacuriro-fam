import React from "react";
import { Typography, Box } from "@mui/material";

function Messages() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5">Messages</Typography>
      <Typography variant="body2" color="text.secondary">
        Your direct messages and group chats will appear here.
      </Typography>
    </Box>
  );
}

export default Messages;
