import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, HeartHandshake, Sparkles } from "lucide-react";
import { RobotCard, type RobotId } from "@/components/curo/RobotAvatar";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "CURO — Choose your mode" }] }),
  component: Home,
});

type Mode = "interview" | "companion";

function Home() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode | null>(null);
  const [robot, setRobot] = useState<RobotId>("aria");

  const next = () => {
    if (!mode) return;
    navigate({ to: "/setup", search: { mode, robot } });
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Sparkles className="size-4 text-pink-300" /> Welcome back
        </div>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-bold">
          What kind of conversation do you want today?
        </h1>
      </motion.div>

      <section className="mt-8 grid md:grid-cols-2 gap-4">
        <ModeCard
          active={mode === "interview"}
          onClick={() => setMode("interview")}
          icon={<Briefcase className="size-6 text-pink-200" />}
          title="Career Interview"
          desc="Sharpen your answers with a smart AI interviewer. Picks follow-ups, gives feedback."
          accent="from-pink-400/30 to-fuchsia-400/20"
        />
        <ModeCard
          active={mode === "companion"}
          onClick={() => setMode("companion")}
          icon={<HeartHandshake className="size-6 text-cyan-200" />}
          title="Emotional Companion"
          desc="Vent, share joy, or think out loud. Warm, judgment-free, deeply listening."
          accent="from-cyan-400/30 to-violet-400/20"
        />
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl mb-3">Pick your robot</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <RobotCard
            robot="aria"
            selected={robot === "aria"}
            onSelect={() => setRobot("aria")}
            tagline="Warm. Emotionally intelligent. Soft and supportive."
          />
          <RobotCard
            robot="leo"
            selected={robot === "leo"}
            onSelect={() => setRobot("leo")}
            tagline="Calm. Smart. Mentor energy. Keeps you sharp."
          />
        </div>
      </section>

      <div className="mt-10 flex justify-end">
        <button
          onClick={next}
          disabled={!mode}
          className="rounded-full gradient-curo px-8 py-3 font-semibold text-white shadow-glow disabled:opacity-50"
        >
          Continue →
        </button>
      </div>
    </main>
  );
}

function ModeCard({ active, onClick, icon, title, desc, accent }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative text-left rounded-3xl p-6 glass overflow-hidden transition ${active ? "ring-2 ring-pink-300/70 shadow-glow" : "hover:ring-1 hover:ring-white/20"}`}
    >
      <div className={`absolute -top-12 -right-12 size-44 rounded-full blur-3xl bg-gradient-to-br ${accent}`} />
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-2xl glass-strong flex items-center justify-center">{icon}</div>
        <div className="font-display text-2xl">{title}</div>
      </div>
      <p className="mt-3 text-sm text-white/70 max-w-md">{desc}</p>
    </motion.button>
  );
}
