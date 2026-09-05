import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    cover: { type: String, default: "" },
    stories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Story" }],
  },
  { timestamps: true }
);

export default mongoose.model("Highlight", highlightSchema);