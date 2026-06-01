import { motion } from "framer-motion";
import ariaImg from "@/assets/robot-aria.jpg";
import leoImg from "@/assets/robot-leo.jpg";

export type RobotId = "aria" | "leo";
export type RobotState = "idle" | "listening" | "thinking" | "speaking";

const META = {
  aria: { name: "ARIA", img: ariaImg, ring: "from-pink-400 via-fuchsia-400 to-cyan-300" },
  leo: { name: "LEO", img: leoImg, ring: "from-cyan-300 via-indigo-400 to-fuchsia-400" },
} as const;

export function RobotAvatar({
  robot,
  state = "idle",
  size = 220,
}: {
  robot: RobotId;
  state?: RobotState;
  size?: number;
}) {
  const m = META[robot];
  const breathing = state === "idle" ? { scale: [1, 1.015, 1] } : { scale: 1 };
  const speakingPulse = state === "speaking" ? { boxShadow: ["0 0 0 0 rgba(255,122,198,0.55)", "0 0 0 28px rgba(255,122,198,0)"] } : {};

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* glow ring */}
      <motion.div
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${m.ring} opacity-70 blur-2xl`}
        animate={state === "thinking" ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 8, repeat: state === "thinking" ? Infinity : 0, ease: "linear" }}
      />
      <motion.div
        className="relative overflow-hidden rounded-full glass-strong"
        style={{ width: size, height: size }}
        animate={{ ...breathing, ...speakingPulse }}
        transition={{ duration: state === "speaking" ? 0.9 : 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <img
          src={m.img}
          alt={m.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          draggable={false}
        />
        {/* state label */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] uppercase tracking-widest glass-strong">
          {state === "listening" && <span className="text-cyan-200">listening…</span>}
          {state === "thinking" && <span className="text-fuchsia-200">thinking…</span>}
          {state === "speaking" && <span className="text-pink-200">speaking</span>}
          {state === "idle" && <span className="text-white/70">{m.name}</span>}
        </div>
      </motion.div>
    </div>
  );
}

export function RobotCard({
  robot,
  selected,
  onSelect,
  tagline,
}: {
  robot: RobotId;
  selected: boolean;
  onSelect: () => void;
  tagline: string;
}) {
  const m = META[robot];
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative w-full text-left rounded-3xl p-5 glass transition ${
        selected ? "ring-2 ring-pink-300/70 shadow-glow" : "hover:ring-1 hover:ring-white/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <RobotAvatar robot={robot} size={96} />
        <div className="flex-1">
          <div className="font-display text-2xl">{m.name}</div>
          <div className="text-sm text-white/70 mt-1">{tagline}</div>
        </div>
      </div>
    </motion.button>
  );
}
