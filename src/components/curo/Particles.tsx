import { useMemo } from "react";
import { motion } from "framer-motion";

export function Particles({ count = 24 }: { count?: number }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 4 + Math.random() * 10,
        duration: 6 + Math.random() * 10,
        delay: Math.random() * 4,
        hue: ["#ff7ac6", "#a78bfa", "#7dd3fc"][i % 3],
      })),
    [count],
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {dots.map((d) => (
        <motion.div
          key={d.id}
          className="absolute rounded-full blur-xl opacity-50"
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size,
            height: d.size,
            background: d.hue,
          }}
          animate={{ y: [0, -30, 0], x: [0, 12, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
