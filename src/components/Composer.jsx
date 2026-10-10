import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The bottom bar from the design: round grey "+" button and a long grey pill
 * input. Enter sends, Shift+Enter adds a new line; a send arrow fades in when
 * there's text (needed on phones, where there's no Enter-to-send habit).
 */
export default function Composer({
  value,
  onChange,
  onSend,
  onPlus,
  plusIcon,
  plusLabel = "More options",
  plusActive = false,
  disabled,
  placeholder = "type your message",
  onTyping,
}) {
  const ref = useRef(null);
  const typingTimer = useRef(null);
  const [focused, setFocused] = useState(false);

  // Auto-grow up to ~5 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 150) + "px";
  }, [value]);

  const signalTyping = () => {
    if (!onTyping) return;
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), 1500);
  };

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    if (onTyping) {
      clearTimeout(typingTimer.current);
      onTyping(false);
    }
  };

  return (
    <div className="flex items-end gap-[10px] md:gap-[11px]">
      <motion.button
        type="button"
        aria-label={plusLabel}
        title={plusLabel}
        onClick={onPlus}
        whileTap={{ scale: 0.9 }}
        animate={{ rotate: plusActive ? 45 : 0 }}
        className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-full bg-bubble text-muted transition-colors hover:bg-[#dcdcdc] md:h-[53px] md:w-[53px]"
      >
        {plusIcon || (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        )}
      </motion.button>

      <motion.div
        animate={{ boxShadow: focused ? "0 0 0 2px rgba(99,186,249,0.45)" : "0 0 0 0px rgba(99,186,249,0)" }}
        className="relative flex min-h-[56px] flex-1 items-center rounded-[28px] bg-bubble md:min-h-[53px]"
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          enterKeyHint="send"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            onChange(e.target.value);
            signalTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-[150px] w-full resize-none bg-transparent py-[15px] pl-[18px] pr-[52px] text-[19px] leading-[1.4] text-soft
            placeholder:text-soft/80 outline-none md:py-[13px] md:pl-[22px] md:text-[20px]"
        />
        <AnimatePresence>
          {value.trim() && (
            <motion.button
              type="button"
              aria-label="Send"
              onClick={submit}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              whileTap={{ scale: 0.88 }}
              className="absolute bottom-[10px] right-[10px] grid h-[36px] w-[36px] place-items-center rounded-full bg-link text-white md:bottom-[9px] md:right-[9px] md:h-[35px] md:w-[35px]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
