import mongoose from "mongoose";
import env from "./env.js";

mongoose.set("strictQuery", true);

export async function connectDB() {
  try {
    await mongoose.connect(env.DATABASE_URL, { maxPoolSize: 20, serverSelectionTimeoutMS: 10_000 });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message); // never log the URL (credentials)
    process.exit(1);
  }
}
