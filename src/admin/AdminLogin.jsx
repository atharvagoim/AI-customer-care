import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useAnimationControls } from "framer-motion";
import GradientBackground from "../components/GradientBackground";
import Footer from "../components/Footer";
import { api } from "../api/client";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const shake = useAnimationControls();
  const inputRef = useRef(null);

  // Already signed in → straight to the dashboard.
  useEffect(() => {
    api
      .get("/api/auth/admin/me")
      .then((r) => r.admin && navigate("/admin/dashboard", { replace: true }))
      .catch(() => {});
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/api/auth/admin", { password });
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message);
      setPassword("");
      shake.start({ x: [0, -12, 10, -8, 6, -3, 0], transition: { duration: 0.45 } });
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const wide = focused || password;

  return (
    <div className="relative flex min-h-dvh flex-col">
    <GradientBackground lively />
    <main className="relative flex min-h-[calc(100dvh-60px)] flex-1 flex-col items-center justify-center px-4 py-16">
      <motion.span
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-medium text-white/90 ring-1 ring-white/20 backdrop-blur-md"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Secure admin access
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="select-none bg-gradient-to-b from-white to-[#9cc4ff] bg-clip-text text-[56px] font-bold leading-[1.1] tracking-[-0.01em] text-transparent drop-shadow-[0_0_40px_rgba(59,140,255,0.45)] md:text-[92px]"
      >
        Admin
      </motion.h1>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-[40px] flex flex-col items-center md:mt-[40px]"
      >
        <motion.div animate={shake}>
          <motion.input
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            aria-label="Admin password"
            placeholder="password"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            animate={{ width: wide ? 230 : 143 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="h-[34px] rounded-full bg-pill px-4 text-center text-[18px] md:text-[16px] font-semibold text-ink outline-none
              placeholder:font-semibold placeholder:text-ink focus:ring-2 focus:ring-white/60 md:h-[32px]"
          />
        </motion.div>
        <motion.p
          initial={false}
          animate={{ opacity: error || loading ? 1 : 0, y: error || loading ? 0 : -4 }}
          className="mt-3 h-5 text-[13px] text-white/85"
          role="status"
        >
          {loading ? "Checking…" : error}
        </motion.p>
      </motion.form>
    </main>
    <Footer />
    </div>
  );
}
