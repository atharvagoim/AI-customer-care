import { useEffect, useState } from "react";
import { io } from "socket.io-client";

/**
 * One Socket.IO connection per page, same origin, authenticated by the httpOnly cookies.
 * `admin: true` asks the server for admin rights (granted only with a valid admin session).
 */
export function useSocket({ admin = false } = {}) {
  const [socket] = useState(() =>
    io({ autoConnect: false, withCredentials: true, auth: { as: admin ? "admin" : "visitor" }, transports: ["websocket", "polling"] })
  );

  useEffect(() => {
    let cancelled = false;
    // Make sure the visitor cookie exists before the handshake (first visit).
    fetch("/api/session", { credentials: "same-origin" })
      .catch(() => {})
      .finally(() => !cancelled && socket.connect());
    // If the handshake is refused (e.g. cookie just expired), retry a few times.
    let retries = 0;
    const onError = () => {
      if (cancelled || ++retries > 5) return;
      setTimeout(() => !cancelled && socket.connect(), 1500 * retries);
    };
    socket.on("connect_error", onError);
    return () => {
      cancelled = true;
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [socket]);

  return socket;
}

/** Joins a conversation room, and re-joins after reconnects. */
export function useJoinConversation(socket, conversationId) {
  useEffect(() => {
    if (!socket || !conversationId) return;
    const join = () => socket.emit("join", conversationId);
    if (socket.connected) join();
    socket.on("connect", join);
    return () => socket.off("connect", join);
  }, [socket, conversationId]);
}
