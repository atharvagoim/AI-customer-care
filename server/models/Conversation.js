import mongoose from "mongoose";
import { CATEGORIES, CONVERSATION_STATUSES, PRIORITIES, SENTIMENTS } from "./enums.js";

// Never send the visitor id back out (API responses / socket payloads).
const hideVisitor = { transform: (_doc, ret) => (delete ret.visitorId, delete ret.__v, ret) };

const conversationSchema = new mongoose.Schema(
  {
    visitorId: { type: String, required: true }, // from the signed visitor cookie
    guestName: { type: String, default: "Guest", maxlength: 80 },
    guestEmail: { type: String, default: "", maxlength: 120 },

    status: { type: String, enum: CONVERSATION_STATUSES, default: "active" },
    // true → AI answers automatically; false → a human (admin) is handling it.
    aiEnabled: { type: Boolean, default: true },

    intent: { type: String, default: "general_question", maxlength: 40 },
    sentiment: { type: String, enum: SENTIMENTS, default: "neutral" },
    priority: { type: String, enum: PRIORITIES, default: "low" },
    category: { type: String, enum: CATEGORIES, default: "general" },
    summary: { type: String, default: "", maxlength: 600 },

    // Denormalised for fast inbox / "previous chats" lists.
    title: { type: String, default: "New conversation" },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unreadByAdmin: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: hideVisitor, toObject: hideVisitor }
);

conversationSchema.index({ visitorId: 1, lastMessageAt: -1 }); // "Previous chat"
conversationSchema.index({ lastMessageAt: -1 }); // admin inbox
conversationSchema.index({ aiEnabled: 1, lastMessageAt: -1 });
conversationSchema.index({ status: 1, lastMessageAt: -1 });

export default mongoose.model("Conversation", conversationSchema);
