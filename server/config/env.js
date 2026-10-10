import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

// Single .env at the project root.
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

// `npm start` passes --prod (works on Windows, macOS and Linux alike).
if (process.argv.includes("--prod")) process.env.NODE_ENV = "production";
const isProd = process.env.NODE_ENV === "production";
const problems = [];

if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is required.");

const jwtSecret = process.env.JWT_SECRET || "";
if (jwtSecret.length < 32) problems.push("JWT_SECRET must be at least 32 characters (use a long random string).");

const adminPassword = process.env.ADMIN_PASSWORD || "";
if (isProd && adminPassword.length < 10) problems.push("ADMIN_PASSWORD must be at least 10 characters in production.");

if (problems.length) {
  console.error("❌ Configuration error:\n   - " + problems.join("\n   - ") + "\n   Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const env = Object.freeze({
  isProd,
  PORT: Number(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: jwtSecret,
  ADMIN_PASSWORD: adminPassword,
  ADMIN_SESSION_HOURS: Math.min(Math.max(Number(process.env.ADMIN_SESSION_HOURS) || 12, 1), 24 * 30),
  // Number of reverse proxies in front of the app (Render/Railway/Nginx = 1). Used for correct client IPs.
  TRUST_PROXY: process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : isProd ? 1 : 0,

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
  OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL || "",
  OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME || "AI Customer Care",
});

if (!env.ADMIN_PASSWORD) console.warn("⚠️  ADMIN_PASSWORD is not set — /admin login is disabled until you add it to .env.");
if (!env.OPENROUTER_API_KEY) console.warn("⚠️  OPENROUTER_API_KEY is not set — the AI will send a fallback message until you add it.");

export default env;
