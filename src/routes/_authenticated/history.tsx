import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { deleteConversation, getConversation, listConversations, listLoginHistory } from "@/lib/curo/chat.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "CURO — Your history" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const del = useServerFn(deleteConversation);
  const get = useServerFn(getConversation);
  const logins = useServerFn(listLoginHistory);
  const navigate = useNavigate();

  const conv = useQuery({ queryKey: ["conversations"], queryFn: () => list() });
  const logs = useQuery({ queryKey: ["logins"], queryFn: () => logins() });

  const onDelete = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await del({ data: { id } });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const onExport = async (id: string, title: string) => {
    try {
      const res = await get({ data: { id } });
      const lines = res.messages.map((m: any) => `[${new Date(m.created_at).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`);
      const blob = new Blob([`CURO — ${title}\n\n${lines.join("\n\n")}`], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `curo-${id.slice(0, 8)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <motion.h1 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl font-bold">Your conversations</motion.h1>
      <p className="text-white/70 mt-2">Resume, replay, export, or delete past chats.</p>

      <section className="mt-8 grid gap-3">
        {conv.isLoading && <div className="text-white/60">Loading…</div>}
        {conv.data?.conversations?.length === 0 && (
          <div className="glass rounded-3xl p-8 text-center">
            <p className="text-white/70">No conversations yet.</p>
            <button onClick={() => navigate({ to: "/home" })} className="mt-4 rounded-full gradient-curo px-5 py-2 text-white text-sm shadow-glow">Start one</button>
          </div>
        )}
        {conv.data?.conversations?.map((c: any) => (
          <div key={c.id} className="glass rounded-2xl p-4 flex flex-col gap-3 hover:bg-white/5 transition">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-2xl gradient-curo flex items-center justify-center text-sm font-bold">
                {c.robot === "aria" ? "A" : "L"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {c.title ?? "Untitled"}
                  {typeof c.score === "number" && (
                    <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 gradient-curo text-white">
                      {c.score}/100
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/60">
                  {c.mode} · {new Date(c.started_at).toLocaleString()} {c.duration_s ? `· ${Math.floor(c.duration_s / 60)}m ${c.duration_s % 60}s` : ""}
                </div>
              </div>
              <Link
                to="/chat/$conversationId"
                params={{ conversationId: c.id }}
                className="rounded-full glass px-3 py-1.5 text-xs hover:bg-white/10"
              >
                Resume
              </Link>
              <button onClick={() => onExport(c.id, c.title ?? "chat")} className="rounded-full glass p-2 hover:bg-white/10" title="Export">
                <Download className="size-4" />
              </button>
              <button onClick={() => onDelete(c.id)} className="rounded-full glass p-2 hover:bg-red-500/30" title="Delete">
                <Trash2 className="size-4" />
              </button>
            </div>
            {c.summary && (
              <div className="text-sm text-white/70 whitespace-pre-wrap border-t border-white/10 pt-3">
                {c.summary}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl mb-3">Recent sign-ins</h2>
        <div className="glass rounded-2xl divide-y divide-white/10">
          {logs.isLoading && <div className="p-4 text-white/60 text-sm">Loading…</div>}
          {logs.data?.logins?.length === 0 && <div className="p-4 text-white/60 text-sm">No logins yet.</div>}
          {logs.data?.logins?.map((l: any) => (
            <div key={l.id} className="p-3 text-sm flex items-center justify-between">
              <span>{new Date(l.signed_in_at).toLocaleString()}</span>
              <span className="text-white/50 truncate max-w-[60%]">{l.user_agent}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
