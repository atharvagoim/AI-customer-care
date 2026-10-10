/**
 * Cookie-based identity — nothing sensitive is ever readable by page JavaScript.
 *
 *  - Visitor cookie: random id, HMAC-signed, httpOnly. Ties a browser to its own chats
 *    ("Previous chat") without any signup. A forged/edited cookie fails the signature check.
 *  - Admin cookie: short-lived JWT, httpOnly + SameSite=Strict. Bound to a fingerprint of
 *    ADMIN_PASSWORD, so changing the password logs every admin session out.
 */
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { parse as parseCookies } from "cookie";
import { signedCookie } from "cookie-parser";
import env from "../config/env.js";

// "__Host-" prefix (production, HTTPS) = cookie can't be set by subdomains or over plain HTTP.
const prefix = env.isProd ? "__Host-" : "";
export const VISITOR_COOKIE = `${prefix}aicc_vid`;
export const ADMIN_COOKIE = `${prefix}aicc_admin`;

const base = { httpOnly: true, secure: env.isProd, path: "/" };
const VISITOR_RE = /^[a-f0-9-]{36}$/;

const passwordFingerprint = () =>
  crypto.createHash("sha256").update(`pv:${env.ADMIN_PASSWORD}`).digest("hex").slice(0, 16);

/** Ensures every API request has a signed visitor id (issues one if missing). */
export function visitor(req, res, next) {
  let id = req.signedCookies?.[VISITOR_COOKIE];
  if (typeof id !== "string" || !VISITOR_RE.test(id)) {
    id = crypto.randomUUID();
    res.cookie(VISITOR_COOKIE, id, { ...base, signed: true, sameSite: "lax", maxAge: 365 * 24 * 3600 * 1000 });
  }
  req.visitorId = id;
  next();
}

export function issueAdminSession(res) {
  const token = jwt.sign({ role: "admin", pv: passwordFingerprint() }, env.JWT_SECRET, {
    expiresIn: `${env.ADMIN_SESSION_HOURS}h`,
    algorithm: "HS256",
  });
  res.cookie(ADMIN_COOKIE, token, { ...base, sameSite: "strict", maxAge: env.ADMIN_SESSION_HOURS * 3600 * 1000 });
}

export function clearAdminSession(res) {
  res.clearCookie(ADMIN_COOKIE, { ...base, sameSite: "strict" });
}

export function verifyAdminToken(token) {
  if (!token || !env.ADMIN_PASSWORD) return false;
  try {
    const p = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    return p.role === "admin" && p.pv === passwordFingerprint();
  } catch {
    return false;
  }
}

export function requireAdmin(req, res, next) {
  if (verifyAdminToken(req.cookies?.[ADMIN_COOKIE])) return next();
  res.status(401).json({ error: "Please sign in again." });
}

/** Constant-time password check (hashing first hides the length too). */
export function checkAdminPassword(given) {
  if (!env.ADMIN_PASSWORD || typeof given !== "string") return false;
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Identity for Socket.IO handshakes (same cookies, parsed by hand). */
export function identityFromCookieHeader(header = "") {
  const jar = parseCookies(header || "");
  const rawVid = jar[VISITOR_COOKIE];
  const vid = rawVid ? signedCookie(rawVid, env.JWT_SECRET) : false;
  return {
    visitorId: typeof vid === "string" && VISITOR_RE.test(vid) ? vid : null,
    isAdmin: verifyAdminToken(jar[ADMIN_COOKIE]),
  };
}
