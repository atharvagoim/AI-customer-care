import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api/client";
import { useSocket } from "../lib/socket";
import { useToast } from "../components/Toast";

/** Guards /admin/* and renders the small nav shared by Dashboard and Chats. */
export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [ok, setOk] = useState(null);
  const [unreadMap, setUnreadMap] = useState({});
  const socket = useSocket({ admin: true });

  useEffect(() => {
    api
      .get("/api/auth/admin/me")
      .then((r) => setOk(Boolean(r.admin)))
      .catch(() => setOk(false));
  }, []);

  // Unread badge: seed from the inbox, then keep it live.
  useEffect(() => {
    if (!ok) return;
    api
      .get("/api/admin/conversations")
      .then((list) => setUnreadMap(Object.fromEntries(list.map((c) => [c._id, c.unreadByAdmin || 0]))))
      .catch(() => {});
  }, [ok]);

  useEffect(() => {
    if (!socket) return;
    const onConversation = (c) => setUnreadMap((m) => ({ ...m, [c._id]: c.unreadByAdmin || 0 }));
    const onMessage = ({ conversationId, message }) => {
      if (message.sender !== "user") return;
      if (location.pathname === `/admin/chats/${conversationId}`) return;
      toast(`New message: ${message.text.slice(0, 60)}`, { onClick: () => navigate(`/admin/chats/${conversationId}`) });
    };
    socket.on("conversation", onConversation);
    socket.on("message", onMessage);
    return () => {
      socket.off("conversation", onConversation);
      socket.off("message", onMessage);
    };
  }, [socket, location.pathname, navigate, toast]);

  if (ok === false) return <Navigate to="/admin" replace />;
  if (ok === null)
    return (
      <div className="grid h-screen place-items-center">
        <motion.span
          className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        />
      </div>
    );

  const logout = async () => {
    await api.post("/api/auth/admin/logout").catch(() => {});
    navigate("/admin", { replace: true });
  };

  const unread = Object.values(unreadMap).reduce((a, b) => a + b, 0);
  return <Outlet context={{ logout, socket, unread }} />;
}

export function AdminNav({ logout, unread = 0 }) {
  const link = ({ isActive }) =>
    `relative rounded-full px-4 py-2 text-[15px] transition-colors md:px-5 ${isActive ? "text-brand font-semibold" : "text-muted hover:text-brand"}`;
  return (
    <nav className="flex items-center gap-1 rounded-full bg-card p-1">
      <NavLink to="/admin/dashboard" className={link}>
        {({ isActive }) => (
          <>
            {isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-full bg-white shadow-sm" />}
            <span className="relative">Dashboard</span>
          </>
        )}
      </NavLink>
      <NavLink to="/admin/chats" className={link}>
        {({ isActive }) => (
          <>
            {isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-full bg-white shadow-sm" />}
            <span className="relative">Chats</span>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white"
              >
                {unread}
              </motion.span>
            )}
          </>
        )}
      </NavLink>
      <button onClick={logout} title="Log out" aria-label="Log out" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
      </button>
    </nav>
  );
}
