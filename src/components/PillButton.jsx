import { motion } from "framer-motion";

/** The light-blue pill used on the landing and admin screens. */
export default function PillButton({ children, className = "", ...props }) {
  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: "0 10px 30px -10px rgba(230,244,254,0.55)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={`h-[34px] w-[153px] rounded-full bg-pill text-ink text-[18px] font-semibold md:text-[16px] leading-none
        outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-60 md:h-[32px] md:w-[143px] ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
