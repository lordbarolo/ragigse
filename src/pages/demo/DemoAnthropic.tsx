import LandingV2 from "./LandingV2";

/**
 * Anthropic-inspirerad typografi och layout ovanpå LandingV2:
 * - Bakgrund #0A0A0A globalt
 * - Rubriker: Georgia serif, #FFFFFF
 * - Brödtext: sans-serif, #A3A3A3
 * - Sekundär text/labels: #6B7280
 * - Generös vertikal white space (≥80px) mellan sektioner på mobil
 *
 * Används som wrapper för startsidan (/) och /demo. SEO/Helmet hanteras
 * av LandingV2 så att startsidan behåller sin indexerbarhet.
 */
export default function DemoAnthropic() {
  return (
    <>
      <div
        className="demo-anthropic-scope"
        style={
          {
            ["--font-display" as any]: 'Georgia, "Times New Roman", serif',
            ["--font-body" as any]:
              '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            backgroundColor: "#0A0A0A",
            minHeight: "100vh",
          } as React.CSSProperties
        }
      >
        <style>{`
          /* ── Bakgrund: tvinga #0A0A0A över hela scopet ── */
          .demo-anthropic-scope,
          .demo-anthropic-scope .bg-black,
          .demo-anthropic-scope [class*="bg-slate-"],
          .demo-anthropic-scope [class*="bg-neutral-"],
          .demo-anthropic-scope [class*="bg-zinc-"],
          .demo-anthropic-scope [class*="bg-gray-"] {
            background-color: #0A0A0A !important;
          }

          /* ── Typografi: Georgia för rubriker ── */
          .demo-anthropic-scope h1,
          .demo-anthropic-scope h2,
          .demo-anthropic-scope h3,
          .demo-anthropic-scope h4,
          .demo-anthropic-scope h5,
          .demo-anthropic-scope h6 {
            font-family: Georgia, "Times New Roman", serif !important;
            color: #FFFFFF !important;
            letter-spacing: -0.02em;
            font-weight: 600;
          }
          .demo-anthropic-scope h1 {
            letter-spacing: -0.03em;
            line-height: 1.05;
          }

          /* Ta bort violet text-gradient så rubriker blir helvita */
          .demo-anthropic-scope .text-gradient-violet {
            background: none !important;
            -webkit-text-fill-color: #FFFFFF !important;
            color: #FFFFFF !important;
          }

          /* ── Brödtext: sans-serif, #A3A3A3 ── */
          .demo-anthropic-scope,
          .demo-anthropic-scope p,
          .demo-anthropic-scope li,
          .demo-anthropic-scope blockquote,
          .demo-anthropic-scope span,
          .demo-anthropic-scope div {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
              "Segoe UI", sans-serif;
          }
          .demo-anthropic-scope p,
          .demo-anthropic-scope li,
          .demo-anthropic-scope blockquote {
            color: #A3A3A3;
          }

          /* ── Sekundär text / labels / eyebrows ── */
          .demo-anthropic-scope label,
          .demo-anthropic-scope small,
          .demo-anthropic-scope figcaption,
          .demo-anthropic-scope .eyebrow,
          .demo-anthropic-scope [data-eyebrow],
          .demo-anthropic-scope .uppercase {
            color: #6B7280 !important;
          }

          /* UI-element behåller sans */
          .demo-anthropic-scope button,
          .demo-anthropic-scope input,
          .demo-anthropic-scope select,
          .demo-anthropic-scope textarea,
          .demo-anthropic-scope [role="button"] {
            font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont,
              "Segoe UI", sans-serif !important;
          }

          /* ── Generös vertikal white space mellan sektioner (mobil ≥80px) ── */
          .demo-anthropic-scope section {
            padding-top: 80px !important;
            padding-bottom: 80px !important;
          }
          @media (min-width: 768px) {
            .demo-anthropic-scope section {
              padding-top: 128px !important;
              padding-bottom: 128px !important;
            }
          }
        `}</style>
        <LandingV2 />
      </div>
    </>
  );
}
