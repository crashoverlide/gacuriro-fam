const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

// GET all my conversations
router.get("/", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username fullName avatar")
      .populate({
        path: "lastMessage",
        populate: { path: "sender", select: "username" },
      })
      .sort({ updatedAt: -1 });

    res.json({ conversations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single conversation
router.get("/:id", auth, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "username fullName avatar")
      .populate("admins", "username");

    if (!conversation) return res.status(404).json({ message: "Not found" });

    // Check if user is participant
    if (!conversation.participants.some((p) => p._id.equals(req.user._id))) {
      return res.status(403).json({ message: "Not allowed" });
    }

    res.json({ conversation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET messages of a conversation
router.get("/:id/messages", auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id })
      .populate("sender", "username avatar")
      .sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SEND message
router.post("/:id/messages", auth, async (req, res) => {
  try {
    const { text, mentions = [] } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const message = await Message.create({
      conversation: req.params.id,
      sender: req.user._id,
      text,
      mentions,
    });

    // Update lastMessage
    conversation.lastMessage = message._id;
    conversation.updatedAt = Date.now();
    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      "sender",
      "username avatar"
    );

    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE private conversation
router.post("/private", auth, async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if already exists
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    }).populate("participants", "username fullName avatar");

    if (conversation) {
      return res.json({ conversation });
    }

    conversation = await Conversation.create({
      isGroup: false,
      participants: [req.user._id, userId],
    });

    const populated = await Conversation.findById(conversation._id).populate(
      "participants",
      "username fullName avatar"
    );

    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE group
router.post("/group", auth, async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: "Name and members required" });
    }

    const allMembers = [...new Set([req.user._id.toString(), ...members])];

    const conversation = await Conversation.create({
      isGroup: true,
      name,
      participants: allMembers,
      admins: [req.user._id],
    });

    const populated = await Conversation.findById(conversation._id).populate(
      "participants",
      "username fullName avatar"
    );

    res.status(201).json({ conversation: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;