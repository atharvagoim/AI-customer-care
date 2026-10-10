import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

/** Number that counts up from 0 when it first appears (and animates on change). */
export default function CountUp({ value = 0, suffix = "" }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    const c = animate(mv, Number(value) || 0, { duration: 1.1, ease: [0.16, 1, 0.3, 1] });
    return () => c.stop();
  }, [value, mv]);
  return <motion.span>{text}</motion.span>;
}
