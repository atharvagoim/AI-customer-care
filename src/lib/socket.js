import { useEffect, useState } from "react";

const POLL_MS = 1500;
const POLL_HIDDEN_MS = 6000;

/**
 * Live updates by short polling (serverless hosts such as Vercel can't keep websockets open).
 * Exposes the small on / off / emit surface the pages already use:
 *   on("message" | "typing" | "conversation", handler), emit("join", id), emit("typing", { conversationId, on }).
 */
class LiveChannel {
  constructor(admin) {
    this.admin = admin;
    this.connected = true;
    this.handlers = new Map();
    this.conv = null;
    this.cursor = null;
    this.seen = new Set();
    this.timer = null;
    this.stopped = true;
  }

  on(event, fn) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event).add(fn);
    return this;
  }

  off(event, fn) {
    this.handlers.get(event)?.delete(fn);
    return this;
  }

  emit(event, payload) {
    if (event === "join") {
      this.conv = payload;
      if (!this.stopped) this.pollNow();
    } else if (event === "typing") {
      fetch(`/api/events/typing${this.admin ? "?as=admin" : ""}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
    return this;
  }

  start() {
    this.stopped = false;
    this.pollNow();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  pollNow() {
    clearTimeout(this.timer);
    this.poll();
  }

  async poll() {
    if (this.stopped) return;
    try {
      const q = new URLSearchParams();
      if (this.admin) q.set("as", "admin");
      if (this.conv) q.set("conv", this.conv);
      if (this.cursor !== null) q.set("since", String(this.cursor));
      const res = await fetch(`/api/events?${q}`, { credentials: "same-origin" });
      if (res.ok) {
        const { cursor, events } = await res.json();
        this.cursor = cursor;
        for (const e of events) {
          if (this.seen.has(e.id)) continue;
          this.seen.add(e.id);
          this.handlers.get(e.type)?.forEach((fn) => fn(e.payload));
        }
        if (this.seen.size > 500) this.seen = new Set([...this.seen].slice(-250));
      }
    } catch {
      /* offline / transient — try again on the next tick */
    }
    if (!this.stopped) this.timer = setTimeout(() => this.poll(), document.hidden ? POLL_HIDDEN_MS : POLL_MS);
  }
}

/** One channel per page. `admin: true` asks for admin rights (granted only with a valid admin session). */
export function useSocket({ admin = false } = {}) {
  const [channel] = useState(() => new LiveChannel(admin));

  useEffect(() => {
    let cancelled = false;
    // Make sure the visitor cookie exists before the first poll (first visit).
    fetch("/api/session", { credentials: "same-origin" })
      .catch(() => {})
      .finally(() => !cancelled && channel.start());
    return () => {
      cancelled = true;
      channel.stop();
    };
  }, [channel]);

  return channel;
}

/** Tells the channel which conversation to follow. */
export function useJoinConversation(socket, conversationId) {
  useEffect(() => {
    if (!socket || !conversationId) return;
    socket.emit("join", conversationId);
  }, [socket, conversationId]);
}
