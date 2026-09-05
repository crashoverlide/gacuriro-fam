import React, { useState } from "react";
import { Button } from "@mui/material";
import { useAuth } from "../context/AuthContext";

function FollowButton({
  targetUserId,
  initialFollowing = false,
  size = "small",
  fullWidth = false,
}) {
  const { toggleFollow } = useAuth();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    // Optimistic update
    setIsFollowing((prev) => !prev);
    setLoading(true);

    try {
      await toggleFollow(targetUserId);
    } catch (err) {
      // Rollback
      setIsFollowing((prev) => !prev);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size={size}
      fullWidth={fullWidth}
      variant={isFollowing ? "outlined" : "contained"}
      onClick={handleClick}
      disabled={loading}
      sx={{
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 700,
        minWidth: 100,
      }}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}

export default FollowButton;