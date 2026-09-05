import express from "express";

const router = express.Router();

// Simple test route
router.get("/", (req, res) => {
  res.json({ message: "Chat API working" });
});

export default router;
