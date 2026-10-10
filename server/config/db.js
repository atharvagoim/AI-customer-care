import mongoose from "mongoose";
import env from "./env.js";

mongoose.set("strictQuery", true);

// Cached on globalThis so warm serverless invocations (and dev reloads) reuse one connection.
const cache = (globalThis.__mongo ??= { promise: null });

export function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  cache.promise ??= mongoose
    .connect(env.DATABASE_URL, { maxPoolSize: env.isServerless ? 5 : 20, serverSelectionTimeoutMS: 10_000 })
    .then((m) => {
      console.log("✅ MongoDB connected");
      return m;
    })
    .catch((err) => {
      cache.promise = null; // allow a retry on the next request
      console.error("❌ MongoDB connection failed:", err.message); // never log the URL (credentials)
      throw err;
    });
  return cache.promise;
}
