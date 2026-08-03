/**
 * Testkonfiguration för end-to-end-tester (*.e2e.test.tsx).
 *
 * Separat från vite.config.ts och från den vanliga testkörningen eftersom
 * app-konfigurationen (TanStack Start) ger react-dom en annan react-instans i
 * testmiljön, vilket kraschar all komponentrendering med
 * "Cannot read properties of null (reading 'useState')".
 * Här dedupas react/react-dom explicit och jsdom används.
 *
 * Kör: bun run test:e2e
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.e2e.test.{ts,tsx}"],
  },
});
