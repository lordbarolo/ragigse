/**
 * Testkonfiguration.
 *
 * Separat från vite.config.ts eftersom app-konfigurationen (TanStack Start)
 * ger react-dom en annan react-instans i testmiljön, vilket gör att alla
 * komponenttester kraschar med "Cannot read properties of null (reading
 * 'useState')". Här dedupas react/react-dom explicit.
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: { dedupe: ["react", "react-dom"] },
  test: {
    globals: true,
    environment: "jsdom",
    // Deno-funktioner (supabase/functions) importerar via https-URL:er och
    // körs inte i vitest.
    exclude: ["node_modules/**", "dist/**", "supabase/**"],
  },
});
