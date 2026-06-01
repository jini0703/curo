# CURO — Local Setup

## Prereqs
- Node 20+ or Bun
- A Supabase project (free tier OK)
- (Optional) ElevenLabs API key for premium voices
- An LLM provider key. The code uses Lovable AI Gateway (`LOVABLE_API_KEY`).
  To run outside Lovable, either set `LOVABLE_API_KEY` from your Lovable workspace,
  or edit `src/lib/curo/chat.functions.ts` to call OpenAI/Gemini/Anthropic directly.

## Install
```bash
bun install   # or: npm install
```

## Configure
```bash
cp .env.example .env
# fill in values
```

## Database
Run the SQL files in `supabase/migrations/` against your Supabase project
(via the Supabase SQL editor or `supabase db push`).

Enable Google OAuth in Supabase Auth → Providers if you want social login.

## Dev
```bash
bun run dev    # http://localhost:8080
```

## Build
```bash
bun run build
bun run start
```
