import { createFileRoute } from "@tanstack/react-router";

const VOICES: Record<string, string> = {
  aria: "EXAVITQu4vr4xnSDxMaL", // Sarah — warm female
  leo: "JBFqnCBsd6RMkjVDRZzb",  // George — calm male
};

export const Route = createFileRoute("/api/elevenlabs/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response("ELEVENLABS_API_KEY not configured", { status: 500 });
        }
        let body: { text?: string; robot?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const text = (body.text ?? "").toString().slice(0, 4000).trim();
        const robot = (body.robot ?? "aria").toString();
        if (!text) return new Response("Missing text", { status: 400 });
        const voiceId = VOICES[robot] ?? VOICES.aria;

        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.45,
                similarity_boost: 0.8,
                style: 0.35,
                use_speaker_boost: true,
              },
            }),
          },
        );

        if (!upstream.ok || !upstream.body) {
          const err = await upstream.text().catch(() => "");
          return new Response(`TTS upstream error ${upstream.status}: ${err.slice(0, 200)}`, {
            status: 502,
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
