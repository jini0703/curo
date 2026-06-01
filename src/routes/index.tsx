import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Brand } from "@/components/curo/Brand";
import { Particles } from "@/components/curo/Particles";
import { RobotAvatar } from "@/components/curo/RobotAvatar";
import { recordLogin } from "@/lib/curo/chat.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CURO — Sign in to your AI robot companions" },
      { name: "description", content: "Sign in to CURO to talk with ARIA & LEO, your cute AI robot companions for interviews and emotional support." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const logLogin = useServerFn(recordLogin);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) navigate({ to: "/home" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && event === "SIGNED_IN") {
        logLogin({ data: { userAgent: navigator.userAgent } }).catch(() => {});
        navigate({ to: "/home" });
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate, logLogin]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to CURO! Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <Particles count={28} />
      <div className="mx-auto max-w-7xl px-6 py-6 flex items-center justify-between">
        <Brand />
        <div className="text-xs text-white/60 hidden sm:block">Cute Robots · Real Conversations</div>
      </div>

      <section className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-10 items-center pt-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05]">
            Talk to <span className="text-gradient">cute robots</span><br />
            that actually listen.
          </h1>
          <p className="mt-6 text-lg text-white/75 max-w-xl">
            CURO pairs you with ARIA and LEO — warm, expressive AI companions for
            <span className="text-pink-200"> career interview practice</span> and
            <span className="text-cyan-200"> emotional support</span>. Just speak. They reply, with feeling.
          </p>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex -space-x-4">
              <RobotAvatar robot="aria" size={88} />
              <RobotAvatar robot="leo" size={88} />
            </div>
            <div className="text-sm text-white/70">
              <div className="text-white font-semibold">ARIA &amp; LEO</div>
              <div>Hands-free voice. Real reactions.</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="glass-strong rounded-3xl p-8 shadow-glow"
        >
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setMode("signin")}
              className={`px-4 py-1.5 rounded-full text-sm transition ${mode === "signin" ? "gradient-curo text-white shadow-glow" : "text-white/70 hover:text-white"}`}
            >Sign in</button>
            <button
              onClick={() => setMode("signup")}
              className={`px-4 py-1.5 rounded-full text-sm transition ${mode === "signup" ? "gradient-curo text-white shadow-glow" : "text-white/70 hover:text-white"}`}
            >Create account</button>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-2xl glass hover:bg-white/10 transition px-4 py-3 font-medium flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs text-white/50">
            <div className="h-px flex-1 bg-white/10" /> or email <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <input
                type="text" required placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300/60"
              />
            )}
            <input
              type="email" required placeholder="you@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300/60"
            />
            <input
              type="password" required minLength={6} placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl glass px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-300/60"
            />
            <button
              type="submit" disabled={loading}
              className="w-full rounded-2xl gradient-curo text-white font-semibold py-3 shadow-glow disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <p className="mt-4 text-[11px] text-white/50 text-center">
            By continuing you agree to our friendly, judgment-free vibe. 💜
          </p>
        </motion.div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 16.3 4.5 9.7 8.8 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.5-1.9 12.9-5l-6-4.9c-2 1.5-4.5 2.4-6.9 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.5 39.1 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 4.9C40.9 35.4 43.5 30.1 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}
