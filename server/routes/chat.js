import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { getSettings } from "../models/Setting.js";
import { chatLimiter } from "../middleware/rateLimit.js";
import { addMessage, escalate, runAiReply } from "../services/conversation.service.js";
import * as realtime from "../realtime/index.js";

const router = Router();
const MAX_MESSAGE_LENGTH = 2000;
const MAX_MESSAGES_RETURNED = 300;

/** Loads a conversation owned by this visitor — anything else is a plain 404. */
async function ownConversation(req, id) {
  if (!mongoose.isValidObjectId(id)) return null;
  return Conversation.findOne({ _id: id, visitorId: req.visitorId });
}

async function lastMessages(conversationId) {
  const list = await Message.find({ conversation: conversationId }).sort({ createdAt: -1 }).limit(MAX_MESSAGES_RETURNED).lean();
  return list.reverse();
}

// This browser's previous chats.
router.get("/conversations", async (req, res) => {
  const list = await Conversation.find({ visitorId: req.visitorId })
    .sort({ lastMessageAt: -1 })
    .limit(30)
    .select("title lastMessage lastMessageAt status aiEnabled createdAt")
    .lean();
  res.json(list);
});

// Send a message (creates the conversation on the first one).
router.post("/", chatLimiter, async (req, res) => {
  const { message, conversationId } = req.body || {};
  if (typeof message !== "string" || !message.trim()) return res.status(400).json({ error: "Message is required." });
  if (message.length > MAX_MESSAGE_LENGTH) return res.status(400).json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` });

  let conversation;
  if (conversationId !== undefined && conversationId !== null) {
    conversation = await ownConversation(req, conversationId);
    if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  } else {
    const { aiAutopilot } = await getSettings();
    conversation = await Conversation.create({ visitorId: req.visitorId, aiEnabled: aiAutopilot });
  }

  const userMessage = await addMessage(conversation, "user", message.trim());
  if (!conversation.aiEnabled) {
    return res.json({ conversationId: conversation._id, userMessage, reply: null, mode: "human" });
  }

  const result = await runAiReply(conversation);
  res.json({
    conversationId: conversation._id,
    userMessage,
    reply: result.message || null,
    mode: result.skipped ? "human" : "ai",
    escalated: Boolean(result.ticket),
  });
});

// "Talk to a human": hand the chat to the admin and silence the AI.
router.post("/:id/escalate", chatLimiter, async (req, res) => {
  const conversation = await ownConversation(req, req.params.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });

  const lastUser = await Message.findOne({ conversation: conversation._id, sender: "user" }).sort({ createdAt: -1 }).lean();
  await escalate(conversation, { reason: "Customer requested a human agent", summary: conversation.summary, latestMessage: lastUser?.text });
  const wasAi = conversation.aiEnabled;
  conversation.aiEnabled = false;
  await conversation.save();
  if (wasAi) await addMessage(conversation, "system", "You've asked for a human. A support agent will reply here shortly.");
  else realtime.emitConversation(conversation);
  res.json({ conversation });
});

router.get("/:id", async (req, res) => {
  const conversation = await ownConversation(req, req.params.id);
  if (!conversation) return res.status(404).json({ error: "Conversation not found." });
  res.json({ conversation, messages: await lastMessages(conversation._id) });
});

export default router;
