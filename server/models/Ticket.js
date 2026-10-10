import mongoose from "mongoose";
import { CATEGORIES, PRIORITIES, SENTIMENTS, TICKET_STATUSES } from "./enums.js";

const ticketSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", default: null },
    name: { type: String, default: "Guest" },
    email: { type: String, default: "" },
    subject: { type: String, default: "Support request" },
    message: { type: String, required: true },
    aiSummary: { type: String, default: "" },
    category: { type: String, enum: CATEGORIES, default: "general" },
    sentiment: { type: String, enum: SENTIMENTS, default: "neutral" },
    priority: { type: String, enum: PRIORITIES, default: "medium" },
    status: { type: String, enum: TICKET_STATUSES, default: "open" },
  },
  { timestamps: true, versionKey: false }
);

ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ conversation: 1, status: 1 });

export default mongoose.model("Ticket", ticketSchema);
