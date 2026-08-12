import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  LonekollenAnimation,
  MissadeTimmarAnimation,
  AssistentenAnimation,
} from "@/components/animationer";
import type { Variant } from "@/components/animationer";

export const Route = createFileRoute("/dev/animationer")({
  head: () => ({
    meta: [
      { title: "Landningsanimationer — vårdbemanning.ai" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Förhandsvisning av de tre landningsanimationerna.",
      },
    ],
  }),
  component: AnimationerPage,
});

const SCENES = [
  {
    id: "lonekollen",
    titel: "Lönekollen",
    beskrivning:
      "Vad är din tid värd? Roll → zon → belopp → prisnotis. 16 sekunder. Ljus scen — passar en ljus sektion (#F5F5F7).",
    Comp: LonekollenAnimation,
  },
  {
    id: "timmar",
    titel: "Missade timmar",
    beskrivning:
      "Assistenten skannar fakturaunderlaget och hittar 8 137 kr i ofakturerade timmar. 15 sekunder. Ljus scen.",
    Comp: MissadeTimmarAnimation,
  },
  {
    id: "assistenten",
    titel: "Assistenten",
    beskrivning:
      "Fråga ställs, ramavtal läses, svar med källa, fyra verktyg. 15,5 sekunder. Mörk scen — passar mot #0B0C10.",
    Comp: AssistentenAnimation,
  },
] as const;

function AnimationerPage() {
  const [variant, setVariant] = useState<Variant>("original");
  const [captions, setCaptions] = useState(true);
  const [radius, setRadius] = useState(16);

  return (
    <main
      style={{ background: "#0B0C10", color: "#FFFFFF", minHeight: "100vh" }}
      className="px-5 py-14 sm:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <header className="mb-10">
          <p
            className="mb-3 text-[11px] uppercase"
            style={{ letterSpacing: "0.18em", color: "#6F7178", fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Intern förhandsvisning
          </p>
          <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Landningsanimationer
          </h1>
          <p className="max-w-[620px] text-[15px]" style={{ color: "#B8BAC2" }}>
            Tre fristående scener. Varje komponent fyller sin containers bredd, håller
            16:9, pausar sig själv utanför viewporten och visar en stillbild vid{" "}
            <code>prefers-reduced-motion</code>.
          </p>
        </header>

        {/* Kontroller */}
        <div className="mb-10 flex flex-wrap items-center gap-3">
          <Toggle
            aktiv={variant === "original"}
            onClick={() => setVariant("original")}
            label="Originalpalett"
          />
          <Toggle
            aktiv={variant === "site"}
            onClick={() => setVariant("site")}
            label="Sajtpalett"
          />
          <span style={{ color: "#3A3B44" }}>|</span>
          <Toggle
            aktiv={captions}
            onClick={() => setCaptions((v) => !v)}
            label="Textremsor"
          />
          <Toggle
            aktiv={radius > 0}
            onClick={() => setRadius((r) => (r > 0 ? 0 : 16))}
            label="Rundade hörn"
          />
        </div>

        <div className="flex flex-col gap-16">
          {SCENES.map(({ id, titel, beskrivning, Comp }) => (
            <section key={id}>
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight">{titel}</h2>
                <p className="mt-1 max-w-[640px] text-[14px]" style={{ color: "#9B9DA7" }}>
                  {beskrivning}
                </p>
              </div>
              <Comp variant={variant} captions={captions} radius={radius} />
            </section>
          ))}
        </div>

        <section className="mt-16 rounded-2xl border p-6" style={{ borderColor: "#22232B" }}>
          <h2 className="mb-3 text-lg font-semibold">Så använder du dem</h2>
          <pre
            className="overflow-x-auto rounded-xl p-4 text-[13px] leading-relaxed"
            style={{ background: "#16171F", color: "#C4C6CE", fontFamily: "'IBM Plex Mono', monospace" }}
          >{`import { LonekollenAnimation } from "@/components/animationer";

// Full bredd i en ljus sektion
<LonekollenAnimation variant="site" />

// I ett kort med samma radie som startsidans kort
<MissadeTimmarAnimation variant="site" radius={16} />

// Mörk scen, kant i kant mot #0B0C10, utan textremsor
<AssistentenAnimation variant="site" captions={false} />`}</pre>
          <ul className="mt-4 space-y-1.5 text-[14px]" style={{ color: "#9B9DA7" }}>
            <li>· Ingen datahämtning, inga nya beroenden, ingen Supabase-kontakt.</li>
            <li>· SSR-säker: serverrenderas deterministiskt, hydrerar utan varningar.</li>
            <li>· Pausar utanför viewporten och i bakgrundsflikar.</li>
            <li>· <code>prefers-reduced-motion</code> ger en stillbild av scenens slutläge.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}

function Toggle({
  aktiv,
  onClick,
  label,
}: {
  aktiv: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      className="rounded-full px-4 py-2 text-[13px] font-medium transition-colors"
      style={{
        background: aktiv ? "#FFFFFF" : "transparent",
        color: aktiv ? "#0B0C10" : "#B8BAC2",
        border: `1px solid ${aktiv ? "#FFFFFF" : "#2A2B36"}`,
      }}
    >
      {label}
    </button>
  );
}
