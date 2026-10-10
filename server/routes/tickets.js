import { Router } from "express";
import mongoose from "mongoose";
import Ticket from "../models/Ticket.js";
import { PRIORITIES, SENTIMENTS, TICKET_STATUSES, CATEGORIES } from "../models/enums.js";
import { escapeRegex } from "./admin.js";

const router = Router(); // mounted behind requireAdmin

router.get("/", async (req, res) => {
  const { status, priority, sentiment, category, search } = req.query;
  const filter = {};
  if (TICKET_STATUSES.includes(status)) filter.status = status;
  if (PRIORITIES.includes(priority)) filter.priority = priority;
  if (SENTIMENTS.includes(sentiment)) filter.sentiment = sentiment;
  if (CATEGORIES.includes(category)) filter.category = category;
  if (typeof search === "string" && search.trim()) {
    const rx = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: "i" };
    filter.$or = [{ message: rx }, { subject: rx }, { name: rx }, { email: rx }];
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Ticket.countDocuments(filter),
  ]);
  res.json({ tickets, total, page, pages: Math.ceil(total / limit) });
});

router.put("/:id", async (req, res) => {
  const ticket = mongoose.isValidObjectId(req.params.id) ? await Ticket.findById(req.params.id) : null;
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  const { status, priority } = req.body || {};
  if (status !== undefined) {
    if (!TICKET_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status." });
    ticket.status = status;
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: "Invalid priority." });
    ticket.priority = priority;
  }
  await ticket.save();
  res.json(ticket);
});

export default router;
