import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text, { tone = "info", onClick } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-2), { id, text, tone, onClick }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              layout
              onClick={t.onClick}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`pointer-events-auto max-w-sm rounded-full px-5 py-2.5 text-[14px] shadow-lg ${
                t.tone === "error" ? "bg-[#fde8e2] text-accent" : "bg-ink text-white"
              }`}
            >
              {t.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
