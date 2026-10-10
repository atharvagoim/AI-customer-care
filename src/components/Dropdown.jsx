import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Grey pill (as in the design's Status / Priority / Sentiment) that opens an animated menu. */
export default function Dropdown({ label, value, options, onChange, align = "left" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative shrink-0">
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[44px] items-center gap-2 rounded-full px-[22px] text-[17px] transition-colors md:h-[50px] md:px-[28px] md:text-[20px] ${
          value ? "bg-pill text-brand" : "bg-card text-muted hover:bg-[#ececec]"
        }`}
      >
        {current && value ? current.label : label}
        {value && (
          <span
            role="button"
            aria-label={`Clear ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="-mr-2 grid h-5 w-5 place-items-center rounded-full text-[14px] hover:bg-black/5"
          >
            ×
          </span>
        )}
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={`absolute z-30 mt-2 min-w-[190px] origin-top overflow-hidden rounded-2xl bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.25)] ring-1 ring-black/5 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {[{ value: "", label: `Any ${label.toLowerCase()}` }, ...options].map((o) => (
              <li key={o.value || "any"}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`w-full rounded-xl px-3 py-2 text-left text-[15px] transition-colors hover:bg-card ${
                    o.value === value ? "font-semibold text-brand" : "text-[#555]"
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
