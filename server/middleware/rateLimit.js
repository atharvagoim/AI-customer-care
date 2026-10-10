import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const common = { standardHeaders: "draft-8", legacyHeaders: false };

/** Broad safety net for all API traffic, per IP. */
export const apiLimiter = rateLimit({ ...common, windowMs: 60_000, limit: 300, message: { error: "Too many requests. Please slow down." } });

/** AI calls cost money: per visitor (falls back to IP). */
export const chatLimiter = rateLimit({
  ...common,
  windowMs: 60_000,
  limit: 15,
  keyGenerator: (req) => req.visitorId || ipKeyGenerator(req.ip),
  message: { error: "You're sending messages too quickly. Please wait a moment." },
});

/** Admin password brute-force protection: only failed attempts count. */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60_000,
  limit: 8,
  skipSuccessfulRequests: true,
  message: { error: "Too many attempts. Try again in 15 minutes." },
});

/** Admin AI drafts (each costs an AI call). */
export const draftLimiter = rateLimit({ ...common, windowMs: 60_000, limit: 20, message: { error: "Too many AI drafts. Please wait a moment." } });
