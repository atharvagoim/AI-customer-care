/**
 * One process, one port: REST API + live chat (Socket.IO) + the website.
 *   npm run dev   → Vite runs inside this server (hot reload), http://localhost:3000
 *   npm start     → serves the production build from /dist
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import * as realtime from "./realtime/index.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import adminRoutes from "./routes/admin.js";
import ticketRoutes from "./routes/tickets.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const app = express();

app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(compression());
app.use(cookieParser(env.JWT_SECRET));

// ── API ──
const api = express.Router();
api.get("/health", (req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
api.use(apiLimiter);
api.use(express.json({ limit: "16kb" }));
api.use(csrfGuard);
api.use((req, res, next) => (res.set("Cache-Control", "no-store"), next()));
api.use(visitor);
api.get("/session", (req, res) => res.json({ ok: true })); // issues the visitor cookie
api.use("/auth", authRoutes);
api.use("/chat", chatRoutes);
api.use("/admin", requireAdmin, adminRoutes);
api.use("/tickets", requireAdmin, ticketRoutes);
api.use(apiNotFound);
app.use("/api", api);

const server = http.createServer(app);
realtime.init(server);

// ── Website ──
if (env.isProd) {
  const dist = path.join(root, "dist");
  const indexFile = path.join(dist, "index.html");
  if (!fs.existsSync(indexFile)) {
    console.error("❌ No production build found. Run `npm run build` first.");
    process.exit(1);
  }
  const indexHtml = fs.readFileSync(indexFile, "utf8");
  // Hashed file names → safe to cache "forever".
  app.use("/assets", express.static(path.join(dist, "assets"), { immutable: true, maxAge: "1y", index: false }));
  app.use(express.static(dist, { index: false, maxAge: "1d" }));
  // Client-side routes (/chat/…, /admin/…) all load the app shell.
  app.get("/{*path}", (req, res) => res.set("Cache-Control", "no-cache").type("html").send(indexHtml));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ root, appType: "spa", server: { middlewareMode: true, hmr: { server } } });
  app.use(vite.middlewares);
}

app.use(errorHandler);

await connectDB();
server.listen(env.PORT, () => {
  console.log(`🚀 Ready on http://localhost:${env.PORT}  (admin: /admin)  [${env.isProd ? "production" : "development"}]`);
});

// Graceful shutdown (deploys / Ctrl-C).
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.once(sig, () => {
    server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
