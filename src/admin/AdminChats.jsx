import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { useJoinConversation } from "../lib/socket";
import { AdminNav } from "./AdminLayout";
import { Bubble, SystemNote, TypingBubble } from "../components/ChatBubbles";
import Composer from "../components/Composer";
import { useToast } from "../components/Toast";
import { relative } from "../lib/time";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ai", label: "AI" },
  { key: "human", label: "Manual" },
  { key: "escalated", label: "Escalated" },
  { key: "closed", label: "Closed" },
];

function filterParams(key, search) {
  const p = new URLSearchParams();
  if (key === "ai" || key === "human") p.set("mode", key);
  if (key === "escalated" || key === "closed") p.set("status", key);
  if (search) p.set("search", search);
  return p.toString();
}

function matches(c, key, search) {
  if (key === "ai" && !c.aiEnabled) return false;
  if (key === "human" && c.aiEnabled) return false;
  if ((key === "escalated" || key === "closed") && c.status !== key) return false;
  if (search) {
    const s = search.toLowerCase();
    return [c.title, c.lastMessage, c.guestName, c.guestEmail].some((v) => v && v.toLowerCase().includes(s));
  }
  return true;
}

export default function AdminChats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { logout, socket, unread } = useOutletContext();

  const [list, setList] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [autopilot, setAutopilot] = useState(null);

  const onError = useCallback(
    (e) => {
      if (e.status === 401 || e.status === 403) {
        navigate("/admin", { replace: true });
      } else toast(e.message, { tone: "error" });
    },
    [navigate, toast]
  );

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    api.get(`/api/admin/conversations?${filterParams(filter, query)}`).then(setList).catch(onError);
  }, [filter, query, onError]);

  useEffect(() => {
    api.get("/api/admin/settings").then((s) => setAutopilot(s.aiAutopilot)).catch(onError);
  }, [onError]);

  // Keep the inbox live.
  useEffect(() => {
    if (!socket) return;
    const onConversation = (c) =>
      setList((cur) => {
        if (!cur) return cur;
        const rest = cur.filter((x) => x._id !== c._id);
        const merged = c._id === id ? { ...c, unreadByAdmin: 0 } : c;
        return matches(c, filter, query) ? [merged, ...rest].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)) : rest;
      });
    socket.on("conversation", onConversation);
    return () => socket.off("conversation", onConversation);
  }, [socket, filter, query, id]);

  const toggleAutopilot = async () => {
    const next = !autopilot;
    setAutopilot(next);
    try {
      await api.put("/api/admin/settings", { aiAutopilot: next });
      toast(next ? "New chats will be answered by AI" : "New chats will wait for you");
    } catch (e) {
      setAutopilot(!next);
      onError(e);
    }
  };

  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-dvh-safe flex flex-col bg-white">
      <div className={`mx-auto w-full max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 pt-6 md:flex md:px-[38px] md:pt-[30px] ${id ? "hidden" : "flex"}`}>
        <h1 className="text-[26px] font-bold text-brand md:text-[30px]">Chats</h1>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <Switch on={Boolean(autopilot)} onClick={toggleAutopilot} label="AI autopilot" hint="for new chats" disabled={autopilot === null} />
          <AdminNav logout={logout} unread={unread} />
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1280px] flex-1 gap-6 md:mt-5 md:px-[38px] md:pb-[26px]">
        {/* Inbox */}
        <aside className={`min-h-0 w-full flex-col md:flex md:w-[360px] md:shrink-0 ${id ? "hidden" : "flex"}`}>
          <div className="px-4 pt-4 md:px-0 md:pt-0">
            <label className="flex h-[46px] items-center gap-3 rounded-full bg-card px-5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7D7A7A" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full bg-transparent text-[17px] text-[#555] outline-none placeholder:text-muted"
              />
            </label>
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`relative shrink-0 rounded-full px-4 py-1.5 text-[14px] transition-colors ${filter === f.key ? "text-brand font-semibold" : "bg-card text-muted hover:text-brand"}`}
                >
                  {filter === f.key && <motion.span layoutId="chat-filter" className="absolute inset-0 rounded-full bg-pill" />}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-6 md:px-0 md:pr-1">
            {list === null ? (
              [0, 1, 2, 3].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-[14px] bg-card" />)
            ) : list.length === 0 ? (
              <p className="py-10 text-center text-[15px] text-muted">No chats here yet.</p>
            ) : (
              <AnimatePresence initial={false}>
                {list.map((c) => (
                  <motion.button
                    key={c._id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    onClick={() => navigate(`/admin/chats/${c._id}`)}
                    className={`flex w-full gap-3 rounded-[14px] p-3.5 text-left transition-colors ${c._id === id ? "bg-pill" : "bg-card hover:bg-[#ededed]"}`}
                  >
                    <Avatar name={c.guestName !== "Guest" ? c.guestName : c.title} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[15px] font-semibold text-[#444]">{c.guestName !== "Guest" ? c.guestName : c.title}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-muted">{relative(c.lastMessageAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`truncate text-[13px] ${c.unreadByAdmin ? "font-semibold text-[#444]" : "text-muted"}`}>{c.lastMessage || "—"}</span>
                        <span className="ml-auto flex shrink-0 items-center gap-1.5">
                          <ModeBadge ai={c.aiEnabled} status={c.status} />
                          {c.unreadByAdmin > 0 && c._id !== id && (
                            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                              {c.unreadByAdmin}
                            </motion.span>
                          )}
                        </span>
                      </span>
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`min-h-0 flex-1 flex-col overflow-hidden md:flex md:rounded-[22px] md:ring-1 md:ring-black/[0.06] ${id ? "flex" : "hidden"}`}>
          <AnimatePresence mode="wait">
            {id ? (
              <Thread key={id} id={id} socket={socket} onError={onError} onBack={() => navigate("/admin/chats")} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid flex-1 place-items-center p-10 text-center">
                <div>
                  <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-pill text-[28px]">
                    <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
                    </svg>
                  </motion.div>
                  <p className="text-[18px] font-semibold text-brand">Pick a chat</p>
                  <p className="mt-1 max-w-[320px] text-[14px] text-muted">The AI answers customers on its own. Open any chat to watch it live, take over, or hand it back.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </motion.main>
  );
}

function Thread({ id, socket, onError, onBack }) {
  const toast = useToast();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(null); // "user" | "ai"
  const [drafting, setDrafting] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useJoinConversation(socket, id);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/api/admin/conversations/${id}`)
      .then((d) => {
        if (cancelled) return;
        setConversation(d.conversation);
        setMessages(d.messages);
      })
      .catch((e) => {
        onError(e);
        if (e.status === 404) onBack();
      });
    return () => {
      cancelled = true;
    };
  }, [id, onError, onBack]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = ({ conversationId, message }) => {
      if (conversationId !== id) return;
      setMessages((list) => (list.some((m) => m._id === message._id) ? list : [...list, message]));
      if (message.sender === "user") {
        setTyping(null);
        api.post(`/api/admin/conversations/${id}/read`, {}).catch(() => {});
      }
    };
    const onTyping = ({ conversationId, who, on }) => {
      if (conversationId !== id || who === "agent") return;
      setTyping(on ? who : null);
    };
    const onConversation = (c) => c._id === id && setConversation(c);
    socket.on("message", onMessage);
    socket.on("typing", onTyping);
    socket.on("conversation", onConversation);
    return () => {
      socket.off("message", onMessage);
      socket.off("typing", onTyping);
      socket.off("conversation", onConversation);
    };
  }, [socket, id]);

  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const patch = async (body) => {
    try {
      setConversation(await api.patch(`/api/admin/conversations/${id}`, body));
    } catch (e) {
      onError(e);
    }
  };

  const send = async (text) => {
    setSending(true);
    setInput("");
    try {
      const res = await api.post(`/api/admin/conversations/${id}/messages`, { text });
      setConversation(res.conversation);
      setMessages((list) => (list.some((m) => m._id === res.message._id) ? list : [...list, res.message]));
    } catch (e) {
      setInput(text);
      onError(e);
    } finally {
      setSending(false);
    }
  };

  const draft = async () => {
    setDrafting(true);
    try {
      const { reply, aiUnavailable } = await api.post(`/api/admin/conversations/${id}/suggest`, {});
      if (aiUnavailable) toast("AI isn't configured (OPENROUTER_API_KEY) — showing the fallback text.", { tone: "error" });
      if (reply) setInput(reply);
      else toast("Nothing to reply to yet.");
    } catch (e) {
      onError(e);
    } finally {
      setDrafting(false);
    }
  };

  const emitTyping = (on) => socket && socket.emit("typing", { conversationId: id, on });
  const name = conversation ? (conversation.guestName !== "Guest" ? conversation.guestName : conversation.title) : "";

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }} className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-black/[0.06] px-3 py-3 md:px-6 md:py-4">
        <button onClick={onBack} aria-label="Back to chats" className="grid h-9 w-9 place-items-center text-black md:hidden">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1.5 3.5 6 8 10.5" />
          </svg>
        </button>
        {conversation ? (
          <>
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold text-[#444]">{name}</div>
              <div className="truncate text-[12px] text-muted">
                {conversation.guestEmail || "Anonymous visitor"} · started {relative(conversation.createdAt)}
              </div>
            </div>
            <Switch on={conversation.aiEnabled} onClick={() => patch({ aiEnabled: !conversation.aiEnabled })} label={conversation.aiEnabled ? "AI replying" : "You're replying"} short={conversation.aiEnabled ? "AI" : "You"} />
            <button
              onClick={() => patch({ status: conversation.status === "closed" ? "active" : "closed" })}
              className="hidden rounded-full bg-card px-4 py-2 text-[13px] text-muted transition-colors hover:text-accent md:block"
            >
              {conversation.status === "closed" ? "Reopen" : "Close chat"}
            </button>
          </>
        ) : (
          <div className="h-10 flex-1 animate-pulse rounded-full bg-card" />
        )}
      </header>

      {conversation?.summary && (
        <div className="mx-3 mt-3 rounded-[14px] bg-pill px-4 py-2.5 text-[13px] text-chart-1 md:mx-6">
          <span className="font-semibold">AI summary · </span>
          {conversation.summary}
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
        <div className="flex flex-col gap-[14px]">
          {messages.map((m) =>
            m.sender === "system" ? (
              <SystemNote key={m._id} text={m.text} />
            ) : m.sender === "user" ? (
              <Bubble key={m._id} side="left" text={m.text} time={m.createdAt} />
            ) : (
              <Bubble key={m._id} side="right" tone={m.sender === "agent" ? "brand" : "blue"} text={m.text} time={m.createdAt} label={m.sender === "agent" ? "You" : "AI"} />
            )
          )}
          <AnimatePresence>
            {typing === "user" && <TypingBubble key="u" side="left" />}
            {typing === "ai" && <TypingBubble key="a" side="right" label="AI" />}
          </AnimatePresence>
        </div>
      </div>

      <div className="pb-safe shrink-0 px-3 pt-2 md:px-5 md:pb-5">
        <AnimatePresence>
          {conversation?.aiEnabled && (
            <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 px-2 text-[12px] text-muted">
              AI is answering this chat. Sending a message takes over automatically.
            </motion.p>
          )}
        </AnimatePresence>
        <Composer
          value={input}
          onChange={setInput}
          onSend={send}
          onPlus={draft}
          disabled={sending}
          plusLabel="Draft a reply with AI"
          placeholder={drafting ? "AI is drafting…" : "type your message"}
          onTyping={emitTyping}
          plusIcon={
            <motion.span animate={drafting ? { rotate: 360 } : { rotate: 0 }} transition={drafting ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
              </svg>
            </motion.span>
          }
        />
      </div>
    </motion.div>
  );
}

function Switch({ on, onClick, label, short, hint, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      role="switch"
      aria-checked={on}
      className="flex shrink-0 items-center gap-2.5 rounded-full bg-card py-1.5 pl-1.5 pr-4 disabled:opacity-50"
    >
      <span className={`relative h-[26px] w-[46px] rounded-full transition-colors duration-300 ${on ? "bg-brand" : "bg-[#cfcfcf]"}`}>
        <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 32 }} className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow ${on ? "right-[3px]" : "left-[3px]"}`} />
      </span>
      <span className="text-left leading-tight">
        <span className={`block text-[13px] font-semibold ${on ? "text-brand" : "text-accent"}`}>
          {short ? (
            <>
              <span className="md:hidden">{short}</span>
              <span className="hidden md:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
    </button>
  );
}

function ModeBadge({ ai, status }) {
  if (status === "closed") return <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-muted">Closed</span>;
  return ai ? (
    <span className="rounded-full bg-pill px-2 py-0.5 text-[10px] font-semibold text-chart-1">AI</span>
  ) : (
    <span className="rounded-full bg-[#fdebe3] px-2 py-0.5 text-[10px] font-semibold text-accent">Manual</span>
  );
}

function Avatar({ name = "" }) {
  const initials = useMemo(
    () =>
      name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("") || "?",
    [name]
  );
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-chart-2 to-brand text-[14px] font-semibold text-white">{initials}</span>;
}
