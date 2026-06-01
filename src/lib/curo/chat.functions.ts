import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { systemPromptFor, openingLine } from "./prompts";

const ModeEnum = z.enum(["interview", "companion"]);
const RobotEnum = z.enum(["aria", "leo"]);

export const createConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      mode: ModeEnum,
      robot: RobotEnum,
      category: z.string().min(1).max(120).nullable().optional(),
      subcategory: z.string().min(1).max(120).nullable().optional(),
      tone: z.string().min(1).max(60).nullable().optional(),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const title =
      data.mode === "interview"
        ? `${data.category ?? "Interview"}${data.subcategory ? " · " + data.subcategory : ""}`
        : `${data.category ?? "Companion chat"}${data.subcategory ? " · " + data.subcategory : ""}`;
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        mode: data.mode,
        robot: data.robot,
        category: data.category ?? null,
        subcategory: data.subcategory ?? null,
        tone: data.tone ?? null,
        title,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const opening = openingLine(data.robot, data.mode, data.category ?? null);
    await supabase.from("messages").insert({
      conversation_id: conv.id,
      user_id: userId,
      role: "assistant",
      content: opening,
    });

    return { conversationId: conv.id, opening };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, mode, robot, category, subcategory, tone, title, summary, score, started_at, ended_at, duration_s")
      .order("started_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { conversations: data ?? [] };
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: conv, error: ce } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (ce) throw new Error(ce.message);
    if (!conv) throw new Error("Conversation not found");
    const { data: msgs, error: me } = await supabase
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });
    if (me) throw new Error(me.message);
    return { conversation: conv, messages: msgs ?? [] };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("conversations").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      conversationId: z.string().uuid(),
      userText: z.string().min(1).max(4000),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: conv, error: ce } = await supabase
      .from("conversations")
      .select("id, mode, robot, category, subcategory, tone")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (ce || !conv) throw new Error("Conversation not found");

    await supabase.from("messages").insert({
      conversation_id: conv.id,
      user_id: userId,
      role: "user",
      content: data.userText,
    });

    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(40);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY missing");

    const system = systemPromptFor({
      mode: conv.mode as "interview" | "companion",
      robot: conv.robot as "aria" | "leo",
      category: conv.category,
      subcategory: conv.subcategory,
      tone: conv.tone,
    });

    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: system,
            },
            ...(history ?? []).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            })),
          ],
          temperature: 0.8,
        }),
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Groq error ${res.status}: ${text.slice(0, 200)}`);
    }

    const json = await res.json();

    const reply =
      json?.choices?.[0]?.message?.content?.trim() || "…";

    await supabase.from("messages").insert({
      conversation_id: conv.id,
      user_id: userId,
      role: "assistant",
      content: reply,
    });

    return { reply };
  });

const FILLERS = ["um", "uh", "like", "you know", "sort of", "kind of", "basically", "literally", "actually", "i mean", "right"];

function analyzeUserSpeech(userMessages: string[], durationS: number) {
  const joined = userMessages.join(" ").toLowerCase();
  const words = joined.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let fillerCount = 0;
  for (const f of FILLERS) {
    const re = new RegExp(`\\b${f.replace(/ /g, "\\s+")}\\b`, "g");
    fillerCount += (joined.match(re) ?? []).length;
  }
  const minutes = Math.max(durationS / 60, 0.1);
  const wpm = Math.round(wordCount / minutes);
  return { wordCount, fillerCount, wpm, turns: userMessages.length };
}

export const endConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      durationS: z.number().int().min(0).max(60 * 60 * 6),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: conv } = await supabase
      .from("conversations")
      .select("id, mode, robot, category, subcategory, tone")
      .eq("id", data.id)
      .maybeSingle();

    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", data.id)
      .order("created_at", { ascending: true });

    const userMsgs = (msgs ?? []).filter((m) => m.role === "user").map((m) => m.content);
    const stats = analyzeUserSpeech(userMsgs, data.durationS);

    let summary = "";
    let score: number | null = null;
    const apiKey = process.env.GROQ_API_KEY;

    if (apiKey && msgs && msgs.length > 1 && conv) {
      const transcript = msgs
        .slice(-30)
        .map((m) => `${m.role === "assistant" ? "ROBOT" : "USER"}: ${m.content}`)
        .join("\n");
      const isInterview = conv.mode === "interview";
      const analystSystem = isInterview
        ? `You are a senior interview coach. Analyze the candidate's performance. Be warm but honest.
Return STRICT JSON: {"score": 0-100, "summary": "<3-5 sentences: strengths, gaps, one piece of actionable advice>"}`
        : `You are a warm wellbeing companion reviewing a chat. 
Return STRICT JSON: {"score": 0-100 (mood/openness score), "summary": "<3-5 sentences: emotional themes, what showed up, one gentle next step>"}`;
      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                {
                  role: "system",
                  content: analystSystem,
                },
                {
                  role: "user",
                  content: `Stats: ${JSON.stringify(stats)}\n\nTranscript:\n${transcript}\n\nReturn only JSON.`,
                },
              ],
              temperature: 0.4,
            }),
          }
        );

        if (res.ok) {
          const json = await res.json();

          const raw =
            json?.choices?.[0]?.message?.content ?? "";

          const match = raw.match(/\{[\s\S]*\}/);

          if (match) {
            const parsed = JSON.parse(match[0]);

            if (typeof parsed.score === "number")
              score = Math.max(0, Math.min(100, Math.round(parsed.score)));

            if (typeof parsed.summary === "string")
              summary = parsed.summary.slice(0, 1200);
          }
        }
      } catch {
        // best-effort
      }
    }

    const summaryWithStats = [
      summary,
      `\n\n— Stats — words: ${stats.wordCount} · turns: ${stats.turns} · pace: ${stats.wpm} wpm · filler words: ${stats.fillerCount}`,
    ].filter(Boolean).join("");

    const { error } = await supabase
      .from("conversations")
      .update({
        ended_at: new Date().toISOString(),
        duration_s: data.durationS,
        summary: summaryWithStats || null,
        score,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, stats, score, summary };
  });

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userAgent: z.string().max(500).optional() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("login_history").insert({
      user_id: userId,
      user_agent: data.userAgent ?? null,
    });
    return { ok: true };
  });

export const listLoginHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("login_history")
      .select("id, signed_in_at, user_agent")
      .order("signed_in_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return { logins: data ?? [] };
  });