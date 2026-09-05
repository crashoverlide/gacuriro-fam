import React from "react";
import { Box, Typography, Avatar } from "@mui/material";
import { format } from "date-fns";

function MessageBubble({ message, isOwn }) {
  return (
    <Box
      display="flex"
      justifyContent={isOwn ? "flex-end" : "flex-start"}
      mb={1}
      gap={1}
    >
      {!isOwn && (
        <Avatar
          src={message.sender?.avatar}
          sx={{ width: 28, height: 28, mt: 0.5 }}
        >
          {message.sender?.username?.[0]?.toUpperCase()}
        </Avatar>
      )}

      <Box maxWidth="70%">
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 3,
            bgcolor: isOwn ? "primary.main" : "action.hover",
            color: isOwn ? "#fff" : "text.primary",
          }}
        >
          {message.media?.url ? (
            message.media.type === "image" ? (
              <img
                src={message.media.url}
                alt=""
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            ) : (
              <video
                src={message.media.url}
                controls
                style={{ maxWidth: "100%", borderRadius: 8 }}
              />
            )
          ) : (
            <Typography variant="body2">{message.text}</Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.3, textAlign: isOwn ? "right" : "left" }}
        >
          {message.createdAt
            ? format(new Date(message.createdAt), "HH:mm")
            : ""}
        </Typography>
      </Box>
    </Box>
  );
}

export default MessageBubble;