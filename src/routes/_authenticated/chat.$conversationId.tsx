import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { endConversation, getConversation, sendMessage } from "@/lib/curo/chat.functions";
import { RobotAvatar, type RobotId, type RobotState } from "@/components/curo/RobotAvatar";
import { useVoiceLoop } from "@/hooks/use-voice-loop";

export const Route = createFileRoute("/_authenticated/chat/$conversationId")({
  head: () => ({ meta: [{ title: "CURO — Live conversation" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string; created_at: string };

function ChatPage() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const get = useServerFn(getConversation);
  const send = useServerFn(sendMessage);
  const end = useServerFn(endConversation);

  const { data, isLoading } = useQuery({
    queryKey: ["conv", conversationId],
    queryFn: () => get({ data: { id: conversationId } }),
  });

  const robot = (data?.conversation?.robot as RobotId) ?? "aria";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [pendingUser, setPendingUser] = useState("");
  const [pendingAssistant, setPendingAssistant] = useState("");
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const startedAtRef = useRef(Date.now());
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Seed messages once loaded
  useEffect(() => {
    if (data?.messages) setMessages(data.messages as Msg[]);
  }, [data?.messages]);

  const handleUserUtterance = useCallback(async (text: string) => {
    setPendingUser("");
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content: text, created_at: new Date().toISOString() }]);
    setThinking(true);
    try {
      const res = await send({ data: { conversationId, userText: text } });
      setThinking(false);
      setPendingAssistant(res.reply);
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", content: res.reply, created_at: new Date().toISOString() }]);
      if (!muted) {
        await voice.speak(res.reply);
      }
      setPendingAssistant("");
      // Resume listening
      voice.startListening();
    } catch (e: any) {
      setThinking(false);
      toast.error(e?.message ?? "AI hiccup. Try again?");
      voice.startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, muted, send]);

  const voice = useVoiceLoop({
    robot,
    onUserUtterance: handleUserUtterance,
    onPartial: (t) => setPendingUser(t),
  });

  // Speak opening on mount once messages loaded
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current || !data || muted) return;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && messages.length === 1) {
      greeted.current = true;
      voice.speak(last.content).then(() => voice.startListening());
    } else if (messages.length > 0) {
      greeted.current = true;
      voice.startListening();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, messages.length, muted]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pendingUser, pendingAssistant]);

  const hangUp = async () => {
    voice.stopListening();
    voice.cancelSpeech();
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    try {
      const res: any = await end({ data: { id: conversationId, durationS: duration } });
      if (res?.score != null) {
        toast.success(`Session score: ${res.score}/100`, {
          description: `Words ${res.stats?.wordCount} · ${res.stats?.wpm} wpm · ${res.stats?.fillerCount} filler words`,
        });
      }
    } catch {}
    qc.invalidateQueries({ queryKey: ["conversations"] });
    navigate({ to: "/history" });
  };

  const state: RobotState = thinking ? "thinking" : voice.speaking ? "speaking" : voice.listening ? "listening" : "idle";
  const liveTitle = useMemo(() => data?.conversation?.title ?? "Conversation", [data]);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-white/70">Loading…</div>;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 grid lg:grid-cols-[1.1fr_1fr] gap-6">
      {/* Robot stage */}
      <section className="glass-strong rounded-3xl p-6 md:p-8 flex flex-col items-center justify-between min-h-[60vh]">
        <div className="w-full flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/60">{data?.conversation?.mode}</div>
            <div className="font-display text-xl">{liveTitle}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (!muted) voice.cancelSpeech(); setMuted((m) => !m); }}
              className="rounded-full glass px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/10"
              title={muted ? "Unmute robot" : "Mute robot"}
            >
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              {muted ? "Muted" : "Voice on"}
            </button>
            <button
              onClick={hangUp}
              className="rounded-full bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 text-sm flex items-center gap-2"
            >
              <PhoneOff className="size-4" /> End
            </button>
          </div>
        </div>

        <div className="my-8">
          <RobotAvatar robot={robot} state={state} size={280} />
        </div>

        <div className="w-full text-center min-h-[60px]">
          <AnimatePresence mode="wait">
            {pendingAssistant && (
              <motion.div
                key="assistant-live"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-white/90 text-base md:text-lg"
              >
                {pendingAssistant}
              </motion.div>
            )}
            {!pendingAssistant && pendingUser && (
              <motion.div
                key="user-live"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-cyan-200/90 italic"
              >
                “{pendingUser}”
              </motion.div>
            )}
            {!pendingAssistant && !pendingUser && (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/50 text-sm"
              >
                {voice.supported
                  ? state === "speaking"
                    ? "Speaking…"
                    : state === "thinking"
                    ? "Thinking…"
                    : state === "listening"
                    ? "Go ahead, I'm listening."
                    : "Tap the mic when ready."
                  : "Voice not supported in this browser — please use Chrome."}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {voice.listening ? (
            <button
              onClick={voice.stopListening}
              className="size-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
              title="Pause mic"
            >
              <MicOff className="size-6" />
            </button>
          ) : (
            <button
              onClick={voice.startListening}
              className="size-16 rounded-full gradient-curo flex items-center justify-center shadow-glow animate-pulse-glow"
              title="Start mic"
            >
              <Mic className="size-7 text-white" />
            </button>
          )}
        </div>
      </section>

      {/* Transcript */}
      <section className="glass rounded-3xl p-5 min-h-[60vh] flex flex-col">
        <div className="text-xs uppercase tracking-widest text-white/60 mb-3">Live transcript</div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} robot={robot}>{m.content}</Bubble>
          ))}
          {pendingUser && <Bubble role="user" robot={robot} ghost>{pendingUser}</Bubble>}
          {thinking && <Bubble role="assistant" robot={robot} ghost>…</Bubble>}
          <div ref={transcriptEndRef} />
        </div>
      </section>
    </main>
  );
}

function Bubble({ role, robot, ghost, children }: {
  role: "user" | "assistant" | "system";
  robot: RobotId;
  ghost?: boolean;
  children: React.ReactNode;
}) {
  if (role === "system") return null;
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
      {!isUser && <div className="text-[10px] text-white/50 mt-2 w-12 text-right">{robot === "aria" ? "ARIA" : "LEO"}</div>}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "gradient-curo text-white shadow-glow"
            : "glass text-white/90"
        } ${ghost ? "opacity-60 italic" : ""}`}
      >
        {children}
      </div>
      {isUser && <div className="text-[10px] text-white/50 mt-2 w-8">You</div>}
    </div>
  );
}
