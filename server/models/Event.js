import mongoose from "mongoose";

/**
 * Short-lived live-update events (new message, typing, inbox change).
 * Serverless hosts can't keep websockets open, so clients poll these instead; MongoDB deletes them after 2 minutes.
 */
const eventSchema = new mongoose.Schema(
  {
    conversation: { type: String, required: true, index: true },
    type: { type: String, enum: ["message", "typing", "conversation"], required: true },
    who: String, // typing events only: "user" | "agent" | "ai"
    payload: mongoose.Schema.Types.Mixed,
    at: { type: Date, default: Date.now, index: { expires: 120 } },
  },
  { versionKey: false }
);

export default mongoose.model("Event", eventSchema);
