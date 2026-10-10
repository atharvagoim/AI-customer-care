import { Router } from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Event from "../models/Event.js";
import { ADMIN_COOKIE, verifyAdminToken } from "../middleware/session.js";
import * as realtime from "../realtime/index.js";

const router = Router();
const OVERLAP_MS = 4000; // serverless instances' clocks differ slightly; clients de-duplicate by _id
const MAX_EVENTS = 100;

/** Admin rights only when the admin UI asks for them (an admin testing the customer side stays a customer). */
const isAdminRequest = (req) => req.query.as === "admin" && verifyAdminToken(req.cookies?.[ADMIN_COOKIE]);

// Poll: events newer than `since` (ms). Without `since`, just returns the starting cursor.
router.get("/", async (req, res) => {
  const cursor = Date.now();
  const since = Number(req.query.since);
  if (!Number.isFinite(since)) return res.json({ cursor, events: [] });

  const admin = isAdminRequest(req);
  const conv = typeof req.query.conv === "string" && mongoose.isValidObjectId(req.query.conv) ? req.query.conv : null;
  const filter = { at: { $gt: new Date(Math.max(since - OVERLAP_MS, cursor - 60_000)) } };

  if (admin) {
    filter.$or = [{ type: { $ne: "typing" } }, { who: { $ne: "agent" } }]; // admins don't see each other's typing
  } else {
    if (!conv) return res.json({ cursor, events: [] });
    const owns = await Conversation.exists({ _id: conv, visitorId: req.visitorId });
    if (!owns) return res.json({ cursor, events: [] });
    filter.conversation = conv;
    filter.$or = [{ type: { $ne: "typing" } }, { who: { $ne: "user" } }];
  }

  const rows = await Event.find(filter).sort({ at: 1 }).limit(MAX_EVENTS).lean();
  res.json({ cursor, events: rows.map((e) => ({ id: String(e._id), type: e.type, payload: e.payload })) });
});

// Typing indicator from the browser.
router.post("/typing", async (req, res) => {
  const { conversationId, on } = req.body || {};
  if (typeof conversationId !== "string" || !mongoose.isValidObjectId(conversationId)) return res.status(204).end();
  const admin = isAdminRequest(req);
  const owns = admin || (await Conversation.exists({ _id: conversationId, visitorId: req.visitorId }));
  if (!owns) return res.status(204).end();
  await realtime.emitTyping(conversationId, admin ? "agent" : "user", Boolean(on));
  res.status(204).end();
});

export default router;
