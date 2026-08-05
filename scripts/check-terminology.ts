/**
 * check-terminology.ts
 *
 * Enkel terminologi-validering för UI-text. Körs i prebuild/predev och kan
 * köras manuellt med `bun run check:terminology`.
 *
 * Varnar (exit 1) om utfasade fraser fortfarande förekommer i src/.
 * Undantag: src/_archive/** och rader märkta med `terminology-ok`.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Rule = {
  /** Utfasad fras (case-insensitive). */
  phrase: string;
  /** Vad som ska användas istället. */
  replacement: string;
};

const DEPRECATED: Rule[] = [
  { phrase: "agent i arbete", replacement: 'använd "assistent i arbete"' },
  { phrase: "din agent", replacement: 'använd "din assistent"' },
  { phrase: "ai-agenten", replacement: 'använd "AI-assistenten"' },
  { phrase: "fråga agenten", replacement: 'använd "fråga assistenten"' },
  { phrase: "compcare.se", replacement: "använd vardbemanning.ai" },
  { phrase: "bankid", replacement: 'använd "Digital signering"' },
];

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const IGNORE_DIRS = new Set(["_archive", "node_modules", "security"]);
const EXTS = [".tsx", ".ts"];
const ALLOW_MARKER = "terminology-ok";

/** Filer som legitimt får nämna externa AI-agenter eller tekniska domäner. */
const IGNORE_FILES = [
  "src/pages/admin/AgentApiKeys.tsx",
  "src/components/report/TLDRBox.tsx",
  "src/integrations/supabase/types.ts",
  "src/routeTree.gen.ts",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (IGNORE_DIRS.has(entry)) continue;
      walk(full, out);
    } else if (EXTS.some((e) => entry.endsWith(e))) {
      out.push(full);
    }
  }
  return out;
}

const findings: string[] = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const rel = relative(ROOT, file).split("\\").join("/");
    if (IGNORE_FILES.includes(rel)) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes(ALLOW_MARKER)) return;
      const lower = line.toLowerCase();
      for (const rule of DEPRECATED) {
        let idx = lower.indexOf(rule.phrase);
        let hit = false;
        while (idx !== -1) {
          const before = lower[idx - 1] ?? " ";
          const after = lower[idx + rule.phrase.length] ?? " ";
          // Hoppa över kodidentifierare (hasBankid, has_bankid) — endast UI-text.
          if (!/[a-z0-9_]/.test(before) && !/[a-z0-9_]/.test(after)) {
            hit = true;
            break;
          }
          idx = lower.indexOf(rule.phrase, idx + 1);
        }
        if (hit) {
          findings.push(
            `${rel}:${i + 1}  "${rule.phrase}" — ${rule.replacement}\n    ${line.trim()}`,
          );
        }
      }
    });
  }
}

if (findings.length > 0) {
  console.error("\nTerminologi-kontroll: utfasade fraser hittades\n");
  for (const f of findings) console.error(`  ${f}\n`);
  console.error(
    `${findings.length} träff(ar). Uppdatera texten, eller lägg till "${ALLOW_MARKER}" i en kommentar på raden om användningen är avsiktlig.\n`,
  );
  process.exit(1);
}

console.log("Terminologi-kontroll: OK — inga utfasade fraser i UI-text.");
