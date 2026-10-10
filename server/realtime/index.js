/**
 * Socket.IO: live messages, typing indicators and inbox updates.
 * Same-origin only, cookie-authenticated (no tokens in JS), small payloads, throttled events.
 *
 * Rooms: conv:<id> — the visitor + admins viewing that chat;  admins — every signed-in admin.
 */
import { Server } from "socket.io";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import { identityFromCookieHeader } from "../middleware/session.js";
import { isSameOrigin } from "../middleware/security.js";

let io = null;

export function init(httpServer) {
  io = new Server(httpServer, {
    serveClient: false,
    maxHttpBufferSize: 10_000, // clients only send tiny events
    destroyUpgrade: false, // let Vite's HMR websocket share the port in development
    // Blocks cross-site WebSocket hijacking: the handshake must come from this site.
    allowRequest: (req, cb) => cb(null, isSameOrigin(req)),
  });

  io.use((socket, next) => {
    const { visitorId, isAdmin } = identityFromCookieHeader(socket.handshake.headers.cookie);
    // The admin UI asks for admin rights explicitly; the customer UI never gets them
    // (so an admin testing the customer side in the same browser is treated as a customer).
    socket.data.isAdmin = isAdmin && socket.handshake.auth?.as === "admin";
    socket.data.visitorId = visitorId;
    if (!socket.data.isAdmin && !visitorId) return next(new Error("unauthorized"));
    next();
  });

  io.on("connection", (socket) => {
    if (socket.data.isAdmin) socket.join("admins");
    let lastTyping = 0;
    let joins = 0;
    const joinWindow = setInterval(() => (joins = 0), 60_000);
    socket.on("disconnect", () => clearInterval(joinWindow));

    socket.on("join", async (conversationId) => {
      if (++joins > 40 || typeof conversationId !== "string" || !mongoose.isValidObjectId(conversationId)) return;
      const convo = await Conversation.findById(conversationId).select("visitorId").lean().catch(() => null);
      const allowed = convo && (socket.data.isAdmin || convo.visitorId === socket.data.visitorId);
      if (!allowed) return;
      for (const room of socket.rooms) if (room.startsWith("conv:")) socket.leave(room);
      socket.join(`conv:${conversationId}`);
    });

    socket.on("typing", (payload) => {
      const now = Date.now();
      if (now - lastTyping < 400) return; // throttle
      lastTyping = now;
      const conversationId = payload?.conversationId;
      if (typeof conversationId !== "string" || !socket.rooms.has(`conv:${conversationId}`)) return;
      const event = { conversationId, who: socket.data.isAdmin ? "agent" : "user", on: Boolean(payload.on) };
      socket.to(`conv:${conversationId}`).emit("typing", event);
      if (!socket.data.isAdmin) socket.to("admins").emit("typing", event);
    });
  });
  return io;
}

export function emitMessage(conversationId, message) {
  io?.to(`conv:${conversationId}`).to("admins").emit("message", { conversationId: String(conversationId), message });
}

export function emitTyping(conversationId, who, on) {
  io?.to(`conv:${conversationId}`).to("admins").emit("typing", { conversationId: String(conversationId), who, on });
}

export function emitConversation(conversation) {
  if (!io) return;
  const c = conversation.toObject ? conversation.toObject() : { ...conversation, visitorId: undefined };
  io.to(`conv:${c._id}`).to("admins").emit("conversation", c);
}
