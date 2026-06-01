import { createFileRoute, Outlet, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/curo/Brand";
import { Particles } from "@/components/curo/Particles";
import { History, Home, LogOut, UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        navigate({ to: "/" });
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-strong rounded-3xl px-8 py-6 text-white/70">Warming up the robots…</div>
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen relative">
      <Particles count={18} />
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/40 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
          <Link to="/home"><Brand size="sm" /></Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/home" icon={<Home className="size-4" />} label="Home" />
            <NavLink to="/history" icon={<History className="size-4" />} label="History" />
            <NavLink to="/profile" icon={<UserRound className="size-4" />} label="Profile" />
            <button
              onClick={signOut}
              className="ml-2 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10"
              title={email ?? undefined}
            >
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10"
      activeProps={{ className: "bg-white/10 text-white" }}
    >
      {icon} <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
