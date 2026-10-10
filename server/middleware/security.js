import helmet from "helmet";
import env from "../config/env.js";

/** Security headers. Strict CSP in production (dev needs Vite's inline HMR scripts). */
export const securityHeaders = helmet({
  contentSecurityPolicy: env.isProd
    ? {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // animation libraries set inline style attributes
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "same-origin" },
});

/** True when the request's Origin (if any) is this very site. */
export function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GETs / non-browser clients omit it
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

/**
 * CSRF defence for every state-changing API call:
 *  1. Origin must be this site.
 *  2. A custom header must be present — browsers can't add it cross-site without a CORS
 *     preflight, and this server never answers preflights for other origins.
 * (On top of SameSite cookies.)
 */
export function csrfGuard(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (!isSameOrigin(req) || req.get("x-requested-with") !== "fetch") {
    return res.status(403).json({ error: "Request blocked." });
  }
  next();
}
