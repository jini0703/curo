import { motion } from "framer-motion";

export function Brand({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-5xl md:text-6xl"
      : size === "sm"
        ? "text-xl"
        : "text-3xl";
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex items-center gap-3 font-display font-bold"
    >
      <div className="relative">
        <div className="size-8 rounded-2xl gradient-curo shadow-glow animate-float" />
        <div className="absolute inset-0 size-8 rounded-2xl bg-white/30 blur-md -z-10" />
      </div>
      <span className={`${cls} text-gradient leading-none`}>CURO</span>
    </motion.div>
  );
}
