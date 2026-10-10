/**
 * Conversation logic shared by the customer and admin routes, so AI replies,
 * manual replies, escalation and live broadcasting behave the same everywhere.
 */
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Ticket from "../models/Ticket.js";
import { generateReply } from "./ai.service.js";
import * as realtime from "../realtime/index.js";

const HISTORY_FOR_AI = 24;

export function preview(text, max = 60) {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Saves a message, updates the inbox fields, broadcasts both. */
export async function addMessage(conversation, sender, text) {
  const message = await Message.create({ conversation: conversation._id, sender, text });

  if (sender !== "system") {
    conversation.lastMessage = preview(text);
    conversation.lastMessageAt = message.createdAt;
  }
  if (sender === "user") {
    conversation.unreadByAdmin += 1;
    if (conversation.title === "New conversation") conversation.title = preview(text);
  }
  await conversation.save();

  realtime.emitMessage(conversation._id, message.toObject());
  realtime.emitConversation(conversation);
  return message;
}

/** Escalation ticket (one per open conversation). */
export async function escalate(conversation, { reason, summary, latestMessage }) {
  conversation.status = "escalated";
  const existing = await Ticket.findOne({ conversation: conversation._id, status: { $ne: "closed" } }).lean();
  if (existing) return existing;
  return Ticket.create({
    conversation: conversation._id,
    name: conversation.guestName,
    email: conversation.guestEmail,
    subject: reason ? `Escalation: ${reason}` : "Escalated conversation",
    message: latestMessage || "Customer requested a human agent.",
    aiSummary: summary,
    category: conversation.category,
    sentiment: conversation.sentiment,
    priority: conversation.priority,
  });
}

/** The most recent messages (bounded), oldest first. */
async function recentHistory(conversationId) {
  const latest = await Message.find({ conversation: conversationId, sender: { $ne: "system" } })
    .sort({ createdAt: -1 })
    .limit(HISTORY_FOR_AI)
    .select("sender text")
    .lean();
  return latest.reverse();
}

/** AI reply to the latest customer message (only in AI mode). Shows a typing indicator meanwhile. */
export async function runAiReply(conversation) {
  realtime.emitTyping(conversation._id, "ai", true);
  try {
    const history = await recentHistory(conversation._id);
    const latest = history.pop();
    const result = await generateReply(history, latest?.text || "");

    // An admin may have taken over while the AI was thinking — never talk over them.
    const fresh = await Conversation.findById(conversation._id);
    if (!fresh || !fresh.aiEnabled) return { skipped: true };

    Object.assign(fresh, { intent: result.intent, sentiment: result.sentiment, priority: result.priority, category: result.category });
    if (result.summary) fresh.summary = result.summary;

    let ticket = null;
    if (result.shouldEscalate) {
      ticket = await escalate(fresh, { reason: result.escalationReason, summary: result.summary, latestMessage: latest?.text });
    }
    const message = await addMessage(fresh, "ai", result.reply);
    return { message, ticket, aiUnavailable: Boolean(result.error) };
  } finally {
    realtime.emitTyping(conversation._id, "ai", false);
  }
}

/** AI-drafted reply for the admin composer — never sent automatically. */
export async function suggestReply(conversation) {
  const history = await recentHistory(conversation._id);
  const lastUser = history.map((m) => m.sender).lastIndexOf("user");
  if (lastUser === -1) return { reply: "" };
  const result = await generateReply(history.slice(0, lastUser), history[lastUser].text);
  return { reply: result.reply, aiUnavailable: Boolean(result.error) };
}
