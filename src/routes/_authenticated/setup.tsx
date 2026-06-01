import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { COMPANION_CATEGORIES, COMPANION_TONES, INTERVIEW_CATEGORIES, INTERVIEW_TONES } from "@/lib/curo/topics";
import { createConversation } from "@/lib/curo/chat.functions";

const SearchSchema = z.object({
  mode: z.enum(["interview", "companion"]).catch("interview"),
  robot: z.enum(["aria", "leo"]).catch("aria"),
});

export const Route = createFileRoute("/_authenticated/setup")({
  validateSearch: SearchSchema.parse,
  head: () => ({ meta: [{ title: "CURO — Setup your session" }] }),
  component: Setup,
});

function Setup() {
  const { mode, robot } = Route.useSearch();
  const navigate = useNavigate();
  const create = useServerFn(createConversation);

  const tree = mode === "interview" ? INTERVIEW_CATEGORIES : COMPANION_CATEGORIES;
  const tones = mode === "interview" ? INTERVIEW_TONES : COMPANION_TONES;

  const categories = useMemo(() => Object.keys(tree), [tree]);
  const [category, setCategory] = useState<string>(categories[0]);
  const [subcategory, setSubcategory] = useState<string>(tree[categories[0]][0]);
  const [tone, setTone] = useState<string>(tones[0]);
  const [loading, setLoading] = useState(false);

  const onChangeCategory = (c: string) => {
    setCategory(c);
    setSubcategory(tree[c][0]);
  };

  const start = async () => {
    setLoading(true);
    try {
      const res = await create({ data: { mode, robot, category, subcategory, tone } });
      navigate({ to: "/chat/$conversationId", params: { conversationId: res.conversationId } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start session");
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-3xl md:text-4xl font-bold">
        Set the stage for <span className="text-gradient">{mode === "interview" ? "your interview" : "your conversation"}</span>
      </motion.h1>
      <p className="text-white/70 mt-2">
        {robot === "aria" ? "ARIA" : "LEO"} will adapt to the topic and tone you pick.
      </p>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-5">
          <Label>Category</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c} active={c === category} onClick={() => onChangeCategory(c)}>{c}</Chip>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-5">
          <Label>Subcategory</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {tree[category].map((s) => (
              <Chip key={s} active={s === subcategory} onClick={() => setSubcategory(s)}>{s}</Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 glass rounded-3xl p-5">
        <Label>Tone</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {tones.map((t) => (
            <Chip key={t} active={t === tone} onClick={() => setTone(t)}>{t}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-between">
        <button onClick={() => navigate({ to: "/home" })} className="rounded-full px-5 py-2.5 text-sm text-white/80 hover:bg-white/10">← Back</button>
        <button
          onClick={start}
          disabled={loading}
          className="rounded-full gradient-curo px-8 py-3 font-semibold text-white shadow-glow disabled:opacity-50"
        >
          {loading ? "Waking up " + (robot === "aria" ? "ARIA" : "LEO") + "…" : "Start talking →"}
        </button>
      </div>
    </main>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs uppercase tracking-widest text-white/60">{children}</div>;
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm transition ${active ? "gradient-curo text-white shadow-glow" : "glass hover:bg-white/10"}`}
    >{children}</button>
  );
}
