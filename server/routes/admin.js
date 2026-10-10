import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Ticket from "../models/Ticket.js";
import { getSettings, updateSettings } from "../models/Setting.js";
import { CONVERSATION_STATUSES } from "../models/enums.js";
import { draftLimiter } from "../middleware/rateLimit.js";
import { addMessage, suggestReply } from "../services/conversation.service.js";
import * as realtime from "../realtime/index.js";

const router = Router(); // mounted behind requireAdmin

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const searchRegex = (q) => ({ $regex: escapeRegex(String(q).trim().slice(0, 100)), $options: "i" });

// ── Dashboard ──
router.get("/dashboard", async (req, res) => {
  const [total, active, escalated, open, inProgress, resolved, totalTickets] = await Promise.all([
    Conversation.estimatedDocumentCount(),
    Conversation.countDocuments({ status: "active" }),
    Conversation.countDocuments({ status: "escalated" }),
    Ticket.countDocuments({ status: "open" }),
    Ticket.countDocuments({ status: "in_progress" }),
    Ticket.countDocuments({ status: { $in: ["resolved", "closed"] } }),
    Ticket.estimatedDocumentCount(),
  ]);
  res.json({
    totalConversations: total,
    activeConversations: active,
    escalatedConversations: escalated,
    openTickets: open,
    inProgressTickets: inProgress,
    resolvedTickets: resolved,
    totalTickets,
    aiResolutionRate: total ? Math.round((Math.max(total - escalated, 0) / total) * 100) : 0,
  });
});

// ── Settings ──
router.get("/settings", async (req, res) => res.json({ aiAutopilot: (await getSettings()).aiAutopilot }));

router.put("/settings", async (req, res) => {
  if (typeof req.body?.aiAutopilot !== "boolean") return res.status(400).json({ error: "aiAutopilot must be true or false." });
  res.json({ aiAutopilot: (await updateSettings({ aiAutopilot: req.body.aiAutopilot })).aiAutopilot });
});

// ── Chat inbox ──  ?mode=ai|human  ?status=active|escalated|closed  ?search=
router.get("/conversations", async (req, res) => {
  const { mode, status, search } = req.query;
  const filter = {};
  if (mode === "ai") filter.aiEnabled = true;
  if (mode === "human") filter.aiEnabled = false;
  if (CONVERSATION_STATUSES.includes(status)) filter.status = status;
  if (typeof search === "string" && search.trim()) {
    const rx = searchRegex(search);
    filter.$or = [{ title: rx }, { lastMessage: rx }, { guestName: rx }, { guestEmail: rx }];
  }
  res.json(await Conversation.find(filter).sort({ lastMessageAt: -1 }).limit(100).select("-visitorId -__v").lean());
});

async function load(req, res) {
  const c = mongoose.isValidObjectId(req.params.id) ? await Conversation.findById(req.params.id) : null;
  if (!c) res.status(404).json({ error: "Conversation not found." });
  return c;
}

async function markRead(c) {
  if (!c.unreadByAdmin) return;
  c.unreadByAdmin = 0;
  await c.save();
  realtime.emitConversation(c);
}

router.get("/conversations/:id", async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  await markRead(c);
  const messages = (await Message.find({ conversation: c._id }).sort({ createdAt: -1 }).limit(300).lean()).reverse();
  res.json({ conversation: c, messages });
});

router.post("/conversations/:id/read", async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  await markRead(c);
  res.json({ ok: true });
});

// Switch AI ↔ manual and/or change status.
router.patch("/conversations/:id", async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  const { aiEnabled, status } = req.body || {};
  let note = null;
  if (typeof aiEnabled === "boolean" && aiEnabled !== c.aiEnabled) {
    c.aiEnabled = aiEnabled;
    note = aiEnabled ? "The AI assistant is handling this chat again." : "A support agent has joined the chat.";
  }
  if (CONVERSATION_STATUSES.includes(status)) c.status = status;
  await c.save();
  if (note) await addMessage(c, "system", note);
  else realtime.emitConversation(c);
  res.json(c);
});

// Manual reply — takes the chat over from the AI.
router.post("/conversations/:id/messages", async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Message is required." });
  if (text.length > 2000) return res.status(400).json({ error: "Message is too long (max 2000 characters)." });

  if (c.aiEnabled) {
    c.aiEnabled = false;
    await addMessage(c, "system", "A support agent has joined the chat.");
  }
  if (c.status === "closed") c.status = "active";
  c.unreadByAdmin = 0;
  const message = await addMessage(c, "agent", text);
  res.status(201).json({ message, conversation: c });
});

// AI-drafted reply for the admin to edit.
router.post("/conversations/:id/suggest", draftLimiter, async (req, res) => {
  const c = await load(req, res);
  if (!c) return;
  res.json(await suggestReply(c));
});

export default router;
