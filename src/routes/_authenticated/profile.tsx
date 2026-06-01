import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "CURO — Profile" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [email, setEmail] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      if (data?.display_name) setName(data.display_name);
    })();
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({ id: user.id, display_name: name });
      if (error) throw error;
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold">Your profile</motion.h1>
      <div className="mt-8 glass-strong rounded-3xl p-6 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/60">Email</div>
          <div className="mt-1 text-white/90">{email}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/60">Display name</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300/60"
          />
        </div>
        <button onClick={save} disabled={loading} className="rounded-full gradient-curo px-6 py-2.5 text-sm font-semibold shadow-glow disabled:opacity-60">
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </main>
  );
}
