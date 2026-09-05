import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, default: "" },
    media: {
      url: String,
      type: { type: String, enum: ["image", "video", "audio"] },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);