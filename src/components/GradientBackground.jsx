import { motion } from "framer-motion";
import gradient from "../assets/gradient.jpg";
import homeBg from "../assets/home-bg.png";

// SVG fractal noise — keeps the "film grain" of the design crisp at any size,
// since the source gradient image itself is low resolution.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const orbs = [
  { className: "left-[-10%] top-[10%] h-[45vmax] w-[45vmax] bg-[#1d4dff]/40", x: ["0%", "18%", "0%"], y: ["0%", "12%", "0%"], d: 16 },
  { className: "right-[-12%] bottom-[-8%] h-[40vmax] w-[40vmax] bg-[#3b8cff]/35", x: ["0%", "-16%", "0%"], y: ["0%", "-14%", "0%"], d: 20 },
  { className: "left-[35%] top-[-15%] h-[28vmax] w-[28vmax] bg-[#6a5cff]/30", x: ["0%", "-12%", "0%"], y: ["0%", "16%", "0%"], d: 24 },
];

/**
 * Full-bleed animated gradient with a slow "breathing" drift.
 * `lively` (home page) uses the dark-blue artwork plus drifting glow orbs.
 */
export default function GradientBackground({ lively = false }) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#02030f]" aria-hidden="true">
      <motion.div
        className="absolute -inset-[2%] bg-cover bg-center"
        style={{ backgroundImage: `url(${lively ? homeBg : gradient})`, filter: lively ? "none" : "blur(2px)" }}
        initial={{ scale: 1.03, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], x: ["0%", "-1%", "0%"], y: ["0%", "0.8%", "0%"], opacity: 1 }}
        transition={{
          opacity: { duration: 1.2, ease: "easeOut" },
          default: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        }}
      />
      {lively &&
        orbs.map((o, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full blur-[90px] mix-blend-screen ${o.className}`}
            animate={{ x: o.x, y: o.y, scale: [1, 1.15, 1] }}
            transition={{ duration: o.d, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      <div className="absolute inset-0 opacity-[0.22] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
