import mongoose from "mongoose";
import { CATEGORIES } from "./enums.js";

// Knowledge base used to ground AI answers (see services/ai.service.js).
const faqSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: "general" },
  },
  { timestamps: true, versionKey: false }
);

faqSchema.index({ question: "text", answer: "text" });

export default mongoose.model("FAQ", faqSchema);
