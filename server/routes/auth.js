import { Router } from "express";
import { loginLimiter } from "../middleware/rateLimit.js";
import { ADMIN_COOKIE, checkAdminPassword, clearAdminSession, issueAdminSession, verifyAdminToken } from "../middleware/session.js";
import env from "../config/env.js";

const router = Router();

// Admin sign-in (the design has a single password field).
router.post("/admin", loginLimiter, (req, res) => {
  if (!env.ADMIN_PASSWORD) return res.status(503).json({ error: "Admin login isn't configured. Set ADMIN_PASSWORD in .env." });
  if (!checkAdminPassword(req.body?.password)) return res.status(401).json({ error: "Incorrect password." });
  issueAdminSession(res);
  res.json({ ok: true });
});

router.post("/admin/logout", (req, res) => {
  clearAdminSession(res);
  res.json({ ok: true });
});

// Session check for the UI (no error noise when signed out).
router.get("/admin/me", (req, res) => res.json({ admin: verifyAdminToken(req.cookies?.[ADMIN_COOKIE]) }));

export default router;
