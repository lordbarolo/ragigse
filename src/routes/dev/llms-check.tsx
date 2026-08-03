import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/dev/llms-check")({
  head: () => ({
    meta: [
      { title: "llms.txt-verifiering — CompCare" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Testruta som kontrollerar att /llms.txt levereras med rätt status och content-type.",
      },
    ],
  }),
  component: LlmsCheckPage,
});

type Check = { label: string; ok: boolean; detail: string };

const FILES = ["/llms.txt", "/agent-index.json", "/robots.txt", "/sitemap.xml"];

function LlmsCheckPage() {
  const [results, setResults] = useState<Record<string, Check[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const out: Record<string, Check[]> = {};
        for (const path of FILES) {
          const res = await fetch(`${path}?cachebust=${Date.now()}`, {
            headers: { Accept: "*/*" },
          });
          const body = await res.text();
          const ct = res.headers.get("content-type") ?? "(saknas)";
          const checks: Check[] = [
            { label: "HTTP 200", ok: res.status === 200, detail: String(res.status) },
            { label: "Content-Type", ok: expectedType(path, ct), detail: ct },
            { label: "Inte HTML-fallback", ok: !/^\s*<!doctype html/i.test(body), detail: body.slice(0, 60).replace(/\s+/g, " ") },
            { label: "Innehåll (bytes)", ok: body.length > 50, detail: `${body.length}` },
          ];
          if (path === "/llms.txt") {
            checks.push({
              label: "Börjar med H1 (# )",
              ok: /^#\s/.test(body.trimStart()),
              detail: body.trimStart().split("\n")[0] ?? "",
            });
          }
          if (path === "/agent-index.json") {
            let parsed = false;
            try {
              JSON.parse(body);
              parsed = true;
            } catch {
              parsed = false;
            }
            checks.push({ label: "Giltig JSON", ok: parsed, detail: parsed ? "ok" : "parse-fel" });
          }
          out[path] = checks;
        }
        if (!cancelled) setResults(out);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Verifiering: maskinläsbara filer
          </h1>
          <p className="text-sm text-muted-foreground">
            Hämtar filerna direkt från servern och kontrollerar status, content-type och innehåll.
            Förväntad content-type för <code>/llms.txt</code> är <code>text/markdown</code> eller{" "}
            <code>text/plain</code>.
          </p>
        </header>

        {error && (
          <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Fel vid hämtning: {error}
          </p>
        )}

        {!results && !error && <p className="text-sm text-muted-foreground">Kontrollerar…</p>}

        {results &&
          Object.entries(results).map(([path, checks]) => (
            <section
              key={path}
              className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur"
            >
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="font-mono text-sm text-foreground">{path}</h2>
                <span
                  className={
                    checks.every((c) => c.ok)
                      ? "rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400"
                      : "rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-400"
                  }
                >
                  {checks.every((c) => c.ok) ? "OK" : "Kontrollera"}
                </span>
              </div>
              <ul className="space-y-2 text-sm">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start justify-between gap-4">
                    <span className="text-muted-foreground">
                      {c.ok ? "✓" : "✗"} {c.label}
                    </span>
                    <span className="max-w-[60%] truncate text-right font-mono text-xs text-foreground">
                      {c.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </main>
  );
}

function expectedType(path: string, contentType: string) {
  const ct = contentType.toLowerCase();
  if (path.endsWith(".json")) return ct.includes("application/json");
  if (path.endsWith(".xml")) return ct.includes("xml");
  return ct.includes("text/markdown") || ct.includes("text/plain");
}
