/**
 * The API as an Express app, with no listener — used by server/index.js (local / Node hosts)
 * and api/index.js (Vercel serverless).
 */
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import env from "./config/env.js";
import { connectDB } from "./config/db.js";
import { securityHeaders, csrfGuard } from "./middleware/security.js";
import { visitor, requireAdmin } from "./middleware/session.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { apiNotFound, errorHandler } from "./middleware/errors.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import ticketRoutes from "./routes/tickets.js";
import eventRoutes from "./routes/events.js";

const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(compression());
app.use(cookieParser(env.JWT_SECRET));

const api = express.Router();
api.get("/health", async (req, res) => {
  await connectDB().catch(() => {});
  res.json({ ok: true, db: mongoose.connection.readyState === 1 });
});
api.use(apiLimiter);
api.use(express.json({ limit: "16kb" }));
api.use(csrfGuard);
api.use((req, res, next) => (res.set("Cache-Control", "no-store"), next()));
api.use(async (req, res, next) => {
  await connectDB(); // cached; reconnects on cold starts
  next();
});
api.use(visitor);
api.get("/session", (req, res) => res.json({ ok: true })); // issues the visitor cookie
api.use("/auth", authRoutes);
api.use("/chat", chatRoutes);
api.use("/events", eventRoutes);
api.use("/admin", requireAdmin, adminRoutes);
api.use("/tickets", requireAdmin, ticketRoutes);
api.use(apiNotFound);
app.use("/api", api);
app.use(errorHandler);

export default app;
