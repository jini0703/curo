import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite"; // <-- Add this import

export default defineConfig({
  vite: {
    plugins: [
      nitro({
        preset: "vercel", // <-- Tells Nitro to bundle specifically for Vercel
      }),
    ],
  },
});