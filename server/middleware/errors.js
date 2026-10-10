import env from "../config/env.js";

export function apiNotFound(req, res) {
  res.status(404).json({ error: "Not found." });
}

// Express 5 forwards async errors here automatically.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || err.statusCode || 500;
  if (err.name === "CastError") status = 404; // malformed ids look like "not found"
  if (err.type === "entity.too.large") status = 413;
  if (status < 400 || status > 599) status = 500;

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} → ${err.message}`);
    if (!env.isProd) console.error(err.stack);
  }
  res.status(status).json({
    error: status >= 500 ? "Something went wrong on our end. Please try again." : status === 404 ? "Not found." : err.expose ? err.message : "Request failed.",
  });
}
