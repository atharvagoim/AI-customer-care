import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "../api/client";
import { useJoinConversation, useSocket } from "../lib/socket";
import { Bubble, SystemNote, TypingBubble } from "../components/ChatBubbles";
import Composer from "../components/Composer";
import { useToast } from "../components/Toast";

const GREETING =
  "Hi, I'm Aria, your support assistant. Ask me anything about orders, shipping, payments or returns — or tap **+** to talk to a human.";

const SUGGESTIONS = ["Where is my order?", "How do I return an item?", "How long do refunds take?", "Payment failed but money was deducted"];

let tmpCounter = 0;

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const socket = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(null); // "ai" | "agent" | null
  const [plusOpen, setPlusOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollRef = useRef(null);
  const justCreated = useRef(null); // id we just created locally → skip refetch flicker
  const [greetingTime, setGreetingTime] = useState(() => new Date());

  useJoinConversation(socket, id);

  // Load an existing conversation.
  // (Switching to "new chat" resets state in newChat(); a chat we just created keeps its state.)
  useEffect(() => {
    if (!id || justCreated.current === id) return;
    let cancelled = false;
    api
      .get(`/api/chat/${id}`)
      .then((data) => {
        if (cancelled) return;
        setConversation(data.conversation);
        setMessages(data.messages);
        setGreetingTime(new Date(data.conversation.createdAt));
      })
      .catch((e) => {
        if (cancelled) return;
        toast(e.status === 404 ? "That chat couldn't be found." : e.message, { tone: "error" });
        navigate("/chat", { replace: true });
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, navigate, toast]);

  // Live updates: AI replies, agent replies, typing, takeover changes.
  useEffect(() => {
    if (!socket) return;
    const onMessage = ({ conversationId, message }) => {
      if (conversationId !== id) return;
      setMessages((list) => (list.some((m) => m._id === message._id) ? list : [...list, message]));
      if (message.sender === "agent" || message.sender === "ai") setTyping(null);
    };
    const onTyping = ({ conversationId, who, on }) => {
      if (conversationId !== id || who === "user") return;
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

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: messages.length > 1 ? "smooth" : "auto" });
  }, [messages, typing]);

  const send = useCallback(
    async (text, { retryOf } = {}) => {
      const tempId = retryOf || `tmp-${++tmpCounter}`;
      const optimistic = { _id: tempId, sender: "user", text, createdAt: new Date().toISOString(), pending: true };
      setMessages((list) => (retryOf ? list.map((m) => (m._id === retryOf ? optimistic : m)) : [...list, optimistic]));
      setInput("");
      setPlusOpen(false);

      const aiMode = !conversation || conversation.aiEnabled;
      if (aiMode) setTyping("ai");

      try {
        const res = await api.post("/api/chat", { message: text, conversationId: id || undefined });
        setMessages((list) => {
          let next = list.filter((m) => m._id !== tempId && m._id !== res.userMessage._id);
          next = [...next, res.userMessage];
          if (res.reply && !next.some((m) => m._id === res.reply._id)) next.push(res.reply);
          return next.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        });
        if (!id) {
          justCreated.current = res.conversationId;
          setConversation({ _id: res.conversationId, aiEnabled: res.mode === "ai", status: "active" });
          navigate(`/chat/${res.conversationId}`, { replace: true });
        }
        return res.conversationId;
      } catch (e) {
        setMessages((list) => list.map((m) => (m._id === tempId ? { ...m, pending: false, failed: true } : m)));
        toast(e.message, { tone: "error" });
        return null;
      } finally {
        setTyping(null);
      }
    },
    [conversation, id, navigate, toast]
  );

  const talkToHuman = async () => {
    setPlusOpen(false);
    setMenuOpen(false);
    let convId = id;
    if (!convId) convId = await send("I'd like to talk to a human, please.");
    if (!convId) return;
    try {
      const res = await api.post(`/api/chat/${convId}/escalate`);
      setConversation(res.conversation);
      toast("A support agent has been notified.");
    } catch (e) {
      toast(e.message, { tone: "error" });
    }
  };

  const newChat = () => {
    setMenuOpen(false);
    setPlusOpen(false);
    setConversation(null);
    setMessages([]);
    setTyping(null);
    setLoading(false);
    setGreetingTime(new Date());
    justCreated.current = null;
    navigate("/chat");
  };

  const emitTyping = (on) => socket && id && socket.emit("typing", { conversationId: id, on });
  const humanMode = conversation && !conversation.aiEnabled;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-dvh-safe flex flex-col bg-white"
    >
      {/* Header — desktop: Back / new chat pills; phone: ‹ and ⋮ */}
      <header className="relative flex h-[52px] shrink-0 items-center justify-between px-[14px] md:h-[66px] md:px-[18px] md:pl-[26px]">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => navigate("/")}
          className="hidden h-[34px] items-center rounded-full bg-bubble px-[16px] text-[16px] text-link transition-colors hover:bg-[#dcdcdc] md:flex"
        >
          Back
        </motion.button>
        <button onClick={() => navigate("/")} aria-label="Back" className="-ml-1 grid h-9 w-9 place-items-center text-black md:hidden">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1.5 3.5 6 8 10.5" />
          </svg>
        </button>

        <AnimatePresence>
          {humanMode && (
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-pill px-3 py-1 text-[12px] font-medium text-brand"
            >
              ● Chatting with support
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={newChat}
          className="hidden h-[38px] items-center rounded-full bg-bubble px-[20px] text-[18px] text-soft transition-colors hover:bg-[#dcdcdc] md:flex"
        >
          new chat
        </motion.button>
        <div className="relative md:hidden">
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="-mr-2 grid h-9 w-9 place-items-center text-soft">
            <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.6" />
              <circle cx="2" cy="8" r="1.6" />
              <circle cx="2" cy="14" r="1.6" />
            </svg>
          </button>
          <PopMenu open={menuOpen} onClose={() => setMenuOpen(false)} className="right-0 top-10 origin-top-right">
            <MenuItem onClick={newChat}>New chat</MenuItem>
            <MenuItem onClick={talkToHuman} disabled={humanMode}>Talk to a human</MenuItem>
            <MenuItem onClick={() => navigate("/")}>Home</MenuItem>
          </PopMenu>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-[16px] pb-4 pt-[18px] md:px-[26px] md:pt-[34px]">
        <div className="flex flex-col gap-[14px] md:gap-[16px]">
          <Bubble side="left" text={GREETING} time={greetingTime} />

          {loading && (
            <div className="space-y-4">
              <div className="h-[62px] w-[60%] max-w-[348px] animate-pulse rounded-[13px] bg-bubble/70" />
              <div className="ml-auto h-[62px] w-[60%] max-w-[348px] animate-pulse rounded-[13px] bg-pill/70" />
            </div>
          )}

          {messages.map((m) =>
            m.sender === "system" ? (
              <SystemNote key={m._id} text={m.text} />
            ) : m.sender === "user" ? (
              <Bubble
                key={m._id}
                side="right"
                tone="blue"
                text={m.text}
                time={m.createdAt}
                pending={m.pending}
                failed={m.failed}
                onRetry={() => send(m.text, { retryOf: m._id })}
              />
            ) : (
              <Bubble key={m._id} side="left" text={m.text} time={m.createdAt} label={m.sender === "agent" ? "Support agent" : undefined} />
            )
          )}

          <AnimatePresence>{typing && <TypingBubble key="typing" label={typing === "agent" ? "Support agent" : undefined} />}</AnimatePresence>
        </div>
      </div>

      {/* Composer */}
      <div className="pb-safe relative shrink-0 px-[10px] pt-2 md:px-[20px]">
        <PopMenu open={plusOpen} onClose={() => setPlusOpen(false)} className="bottom-[calc(100%+4px)] left-[10px] origin-bottom-left md:left-[20px]">
          <MenuItem onClick={talkToHuman} disabled={humanMode}>
            Talk to a human
          </MenuItem>
          {!messages.length &&
            SUGGESTIONS.map((s) => (
              <MenuItem key={s} onClick={() => send(s)}>
                {s}
              </MenuItem>
            ))}
          {Boolean(messages.length) && <MenuItem onClick={newChat}>Start a new chat</MenuItem>}
        </PopMenu>
        <Composer
          value={input}
          onChange={setInput}
          onSend={(t) => send(t)}
          onPlus={() => setPlusOpen((o) => !o)}
          plusActive={plusOpen}
          onTyping={emitTyping}
        />
      </div>
    </motion.main>
  );
}

function PopMenu({ open, onClose, className = "", children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && !e.target.closest("[aria-label='More options'],[aria-label='Menu']") && onClose();
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 6 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className={`absolute z-40 min-w-[230px] rounded-[18px] bg-white p-1.5 shadow-[0_18px_44px_-12px_rgba(0,0,0,0.28)] ring-1 ring-black/5 ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MenuItem({ children, ...props }) {
  return (
    <button
      {...props}
      className="block w-full rounded-[12px] px-3.5 py-2.5 text-left text-[15px] text-soft transition-colors hover:bg-card disabled:pointer-events-none disabled:opacity-40"
    >
      {children}
    </button>
  );
}
