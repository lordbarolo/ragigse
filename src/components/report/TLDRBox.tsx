import { Sparkles } from "lucide-react";

interface TLDRBoxProps {
  /** Kort sammanfattning, 1–2 meningar. Ska kunna citeras ordagrant av en AI-agent. */
  summary: string;
  /** Nyckeltal som agenten kan plocka ut direkt. Visas som chips. */
  facts?: Array<{ label: string; value: string }>;
  /** ISO-datum (YYYY-MM-DD). Samma fält som driver `dateModified` i JSON-LD. */
  lastUpdated: string;
  /** Källa, t.ex. "SKR Ramavtal 2026". */
  source?: string;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

/**
 * TL;DR-box på rollrapport-sidor. Gjord för två publik samtidigt:
 *
 * - **Människor**: snabb överblick — kan svara på "vad tjänar X?" på 5 sekunder.
 * - **AI-agenter / LLM-crawlers**: citerbar sammanfattning med strukturerad data
 *   (`data-tldr`, `<time datetime>`, semantiska chips). Samma `lastUpdated`-värde
 *   ska skickas till `buildRoleReportSchemas({ dateModified })` så att schema
 *   och synligt innehåll alltid stämmer.
 */
export default function TLDRBox({ summary, facts = [], lastUpdated, source }: TLDRBoxProps) {
  return (
    <aside
      data-tldr="role-report"
      aria-label="Sammanfattning"
      className="rounded-2xl border border-border bg-card p-5 sm:p-6 card-shadow"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-3.5 h-3.5 text-primary" aria-hidden />
        <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
          TL;DR
        </span>
      </div>

      <p className="text-[15px] sm:text-base text-foreground leading-relaxed">
        {summary}
      </p>

      {facts.length > 0 && (
        <dl className="mt-4 flex flex-wrap gap-2">
          {facts.map((f) => (
            <div
              key={f.label}
              className="inline-flex items-baseline gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1.5"
            >
              <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {f.label}
              </dt>
              <dd className="text-[13px] font-semibold text-foreground tabular-nums">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Senast uppdaterad{" "}
        <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
        {source && <> · Källa: {source}</>}
      </p>
    </aside>
  );
}
