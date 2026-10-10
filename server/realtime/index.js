/**
 * Live updates without websockets (works on serverless hosts such as Vercel).
 * Writers append short-lived Event documents; clients poll GET /api/events (see routes/events.js).
 *
 * Visibility: an event is for the chat's owner (the visitor) and for every signed-in admin.
 */
import Event from "../models/Event.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

async function push(conversationId, type, payload, who) {
  try {
    await Event.create({ conversation: String(conversationId), type, who, payload: plain(payload) });
  } catch (err) {
    console.error("[realtime] could not store event:", err.message); // live updates are best-effort
  }
}

export const emitMessage = (conversationId, message) => push(conversationId, "message", { conversationId: String(conversationId), message });

export const emitTyping = (conversationId, who, on) => push(conversationId, "typing", { conversationId: String(conversationId), who, on }, who);

export function emitConversation(conversation) {
  const c = conversation.toObject ? conversation.toObject() : { ...conversation };
  delete c.visitorId; // never expose the visitor id to other viewers
  return push(c._id, "conversation", c);
}
