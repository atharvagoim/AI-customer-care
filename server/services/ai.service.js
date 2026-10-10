import { createChatCompletion, OpenRouterError } from "./openrouter.service.js";
import { buildSystemPrompt } from "../prompts/systemPrompt.js";
import FAQ from "../models/FAQ.js";
import { CATEGORIES, PRIORITIES, SENTIMENTS } from "../models/enums.js";

const MAX_HISTORY_MESSAGES = 12; // bounded context = bounded cost

export const FALLBACK_REPLY =
  "Thanks for reaching out! Our AI assistant isn't fully configured yet, so I can't answer right now — " +
  "but your message is saved and a human can follow up. Tap + to talk to a human.";

const DEFAULTS = {
  intent: "general_question",
  sentiment: "neutral",
  priority: "low",
  category: "general",
  shouldEscalate: false,
  escalationReason: "",
  summary: "",
};

/** Up to 3 FAQ entries matching the message, to ground the answer in real policy. */
async function getFaqContext(userMessage) {
  try {
    const results = await FAQ.find({ $text: { $search: userMessage.slice(0, 300) } }, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .limit(3)
      .lean();
    return results.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  } catch {
    return ""; // no text index / unsupported → answer without grounding
  }
}

const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Tolerant JSON parsing — a bad model response never breaks the chat. */
function parseModelJson(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    const p = JSON.parse(cleaned);
    return {
      reply: str(p.reply, 3000) || FALLBACK_REPLY,
      intent: str(p.intent, 40) || DEFAULTS.intent,
      sentiment: pick(p.sentiment, SENTIMENTS, "neutral"),
      priority: pick(p.priority, PRIORITIES, "low"),
      category: pick(p.category, CATEGORIES, "general"),
      shouldEscalate: p.shouldEscalate === true,
      escalationReason: str(p.escalationReason, 120),
      summary: str(p.summary, 600),
    };
  } catch {
    return { ...DEFAULTS, reply: raw.trim().slice(0, 3000) || FALLBACK_REPLY };
  }
}

/**
 * One AI call returns the reply AND its classification (intent/sentiment/priority/…).
 * @param {Array<{sender: string, text: string}>} history  oldest first, excluding the latest message
 */
export async function generateReply(history, latestUserMessage) {
  const faqContext = await getFaqContext(latestUserMessage);
  const messages = [
    { role: "system", content: buildSystemPrompt({ faqContext }) },
    ...history.slice(-MAX_HISTORY_MESSAGES).map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text })),
    { role: "user", content: latestUserMessage },
  ];

  try {
    return parseModelJson(await createChatCompletion(messages, { temperature: 0.4, maxTokens: 600 }));
  } catch (err) {
    if (err instanceof OpenRouterError) return { ...DEFAULTS, reply: FALLBACK_REPLY, error: err };
    throw err;
  }
}
