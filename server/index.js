/**
 * One process, one port: REST API + the website.
 *   npm run dev   → Vite runs inside this server (hot reload), http://localhost:3000
 *   npm start     → serves the production build from /dist
 * (On Vercel the API runs from api/index.js instead.)
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";

import env from "./config/env.js";
import { connectDB } from "./config/db.js";
import app from "./app.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const server = http.createServer(app);

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

try {
  await connectDB();
} catch {
  process.exit(1);
}
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
