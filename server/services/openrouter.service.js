import env from "../config/env.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class OpenRouterError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

/** One chat-completion call. The API key never leaves the server. */
export async function createChatCompletion(messages, { temperature = 0.4, maxTokens = 500 } = {}) {
  if (!env.OPENROUTER_API_KEY) throw new OpenRouterError("AI is not configured.", 503);

  let response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        ...(env.OPENROUTER_SITE_URL ? { "HTTP-Referer": env.OPENROUTER_SITE_URL } : {}),
        "X-Title": env.OPENROUTER_SITE_NAME,
      },
      body: JSON.stringify({ model: env.OPENROUTER_MODEL, messages, temperature, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new OpenRouterError(err.name === "TimeoutError" ? "The AI took too long to respond." : "Could not reach the AI service.", 504);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("OpenRouter error:", response.status, body.slice(0, 300));
    throw new OpenRouterError("The AI service returned an error.", response.status === 429 ? 429 : 502);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new OpenRouterError("The AI returned an empty response.");
  return text.trim();
}
