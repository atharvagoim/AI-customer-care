import { motion } from "framer-motion";
import MarkdownMessage from "./MarkdownMessage";
import { clock } from "../lib/time";

const pop = {
  initial: { opacity: 0, y: 14, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 380, damping: 30 },
};

const TONES = {
  grey: "bg-bubble text-soft",
  blue: "bg-pill text-soft",
  brand: "bg-brand text-white",
};

/**
 * A chat bubble as drawn in the design: soft rounded box, timestamp underneath.
 * `side` = left | right, `tone` = grey | blue | brand, optional small `label` above.
 */
export function Bubble({ side = "left", tone = "grey", text, time, label, pending, failed, onRetry }) {
  const right = side === "right";
  return (
    <motion.div layout="position" {...pop} className={`flex flex-col ${right ? "items-end" : "items-start"}`}>
      {label && <span className={`mb-1 px-[10px] text-[11px] font-medium ${right ? "text-right" : ""} text-link`}>{label}</span>}
      <div
        className={`w-fit min-w-[min(330px,92%)] max-w-[min(560px,92%)] min-h-[64px] rounded-[13px] px-[11px] py-[9px]
          text-[17px] leading-[1.45] md:min-h-[62px] md:max-w-[min(560px,80%)] md:min-w-[min(348px,80%)] md:text-[19px] ${TONES[tone]} ${pending ? "opacity-70" : ""}`}
      >
        <MarkdownMessage text={text} />
      </div>
      <span className={`mt-[6px] px-[11px] text-[11px] text-soft md:text-[12px] ${failed ? "text-red-500" : ""}`}>
        {failed ? (
          <button onClick={onRetry} className="underline">Not sent — tap to retry</button>
        ) : pending ? (
          "sending…"
        ) : (
          time && clock(time)
        )}
      </span>
    </motion.div>
  );
}

export function TypingBubble({ side = "left", label }) {
  const right = side === "right";
  return (
    <motion.div {...pop} exit={{ opacity: 0, y: 6 }} className={`flex flex-col ${right ? "items-end" : "items-start"}`}>
      {label && <span className="mb-1 px-[10px] text-[11px] font-medium text-link">{label}</span>}
      <div className="flex h-[46px] items-center gap-[6px] rounded-[13px] bg-bubble px-4">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-soft/70"
            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function SystemNote({ text }) {
  return (
    <motion.div {...pop} className="flex items-center gap-3 py-1 text-[12px] text-muted">
      <span className="h-px flex-1 bg-black/10" />
      <span className="max-w-[80%] text-center">{text}</span>
      <span className="h-px flex-1 bg-black/10" />
    </motion.div>
  );
}
