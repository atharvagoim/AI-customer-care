import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import GradientBackground from "../components/GradientBackground";
import Footer from "../components/Footer";
import PillButton from "../components/PillButton";
import { api } from "../api/client";
import { relative } from "../lib/time";

const rise = (delay = 0) => ({
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] },
});

export default function Landing() {
  const navigate = useNavigate();
  const [showPrevious, setShowPrevious] = useState(false);
  const [chats, setChats] = useState(null);
  const [error, setError] = useState("");

  const openPrevious = async () => {
    if (showPrevious) return setShowPrevious(false);
    setShowPrevious(true);
    setError("");
    try {
      setChats(await api.get("/api/chat/conversations"));
    } catch (e) {
      setError(e.message);
      setChats([]);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col">
    <GradientBackground lively />
    <main className="relative flex min-h-[calc(100dvh-60px)] flex-1 flex-col items-center justify-center px-4 py-16">
      <motion.span
        {...rise(0)}
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-md"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        AI support · live 24/7
      </motion.span>

      <motion.h1
        {...rise(0.1)}
        className="select-none bg-gradient-to-b from-white to-[#9cc4ff] bg-clip-text text-center text-[56px] font-bold leading-[1.1] tracking-[-0.01em] text-transparent drop-shadow-[0_0_40px_rgba(59,140,255,0.45)] md:text-[92px]"
      >
        Need help ?
      </motion.h1>

      <motion.p {...rise(0.2)} className="mt-5 max-w-[460px] text-center text-[16px] leading-relaxed text-white/70 md:text-[18px]">
        Get instant answers from our AI, or hand off to a real person at any moment.
      </motion.p>

      <div className="relative w-full">
        <motion.div
          {...rise(0.3)}
          className="mt-[44px] flex flex-col items-center gap-[24px] md:mt-[46px] md:flex-row md:justify-center md:gap-[38px]"
        >
          <PillButton onClick={() => navigate("/chat")}>New chat</PillButton>
          <PillButton onClick={openPrevious} aria-expanded={showPrevious}>
            Previous chat
          </PillButton>
        </motion.div>

        {/* Anchored right under the buttons; doesn't move the title when it opens */}
        <div className="pointer-events-none absolute inset-x-0 top-full z-10 flex justify-center px-4">
          <AnimatePresence>
            {showPrevious && (
              <motion.section
                initial={{ opacity: 0, y: 16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="pointer-events-auto w-full max-w-[420px] overflow-hidden"
                aria-label="Previous chats"
              >
                <div className="mt-5 max-h-[38vh] overflow-y-auto rounded-[22px] bg-white/10 p-2 ring-1 ring-white/15 backdrop-blur-xl">
                  {chats === null ? (
                    <div className="space-y-2 p-1">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-[52px] animate-pulse rounded-2xl bg-white/10" />
                      ))}
                    </div>
                  ) : chats.length === 0 ? (
                    <p className="px-4 py-5 text-center text-[14px] text-white/80">{error || "No previous chats on this device yet."}</p>
                  ) : (
                    chats.map((c, i) => (
                      <motion.button
                        key={c._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        whileHover={{ backgroundColor: "rgba(230,244,254,0.18)" }}
                        onClick={() => navigate(`/chat/${c._id}`)}
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-white"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{c.title}</span>
                          <span className="block truncate text-[13px] text-white/65">{c.lastMessage}</span>
                        </span>
                        <span className="shrink-0 text-[12px] text-white/60">{relative(c.lastMessageAt)}</span>
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      <motion.ul
        {...rise(0.5)}
        className="mt-24 flex flex-wrap items-center justify-center gap-3 md:mt-28"
      >
        {["Instant replies", "Live human takeover", "Private & secure"].map((f) => (
          <li key={f} className="rounded-full bg-white/[0.07] px-4 py-2 text-[13px] text-white/80 ring-1 ring-white/15 backdrop-blur-md">
            {f}
          </li>
        ))}
      </motion.ul>
    </main>
    <Footer />
    </div>
  );
}
