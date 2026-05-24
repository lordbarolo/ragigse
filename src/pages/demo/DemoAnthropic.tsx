import { Helmet } from "react-helmet-async";
import LandingV2 from "./LandingV2";

/**
 * /demo
 * Kopia av nuvarande landningssida (LandingV2) men med Anthropic-inspirerad
 * typografi: Inter Tight (sans, rubriker) + Source Serif 4 (serif, brödtext).
 * Fonterna är gratis Google Fonts-ersättare för Styrene / Tiempos.
 */
export default function DemoAnthropic() {
  return (
    <>
      <Helmet>
        <title>CompCare (Anthropic-typografi) · demo</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div
        className="demo-anthropic-scope"
        style={
          {
            // Overrida globala font-vars endast inom denna scope
            ["--font-display" as any]: '"Inter Tight", "Inter", system-ui, sans-serif',
            ["--font-body" as any]: '"Source Serif 4", Georgia, serif',
            fontFamily: '"Source Serif 4", Georgia, serif',
          } as React.CSSProperties
        }
      >
        <style>{`
          .demo-anthropic-scope h1,
          .demo-anthropic-scope h2,
          .demo-anthropic-scope h3,
          .demo-anthropic-scope h4 {
            font-family: "Inter Tight", "Inter", system-ui, sans-serif !important;
            letter-spacing: -0.035em;
            font-weight: 800;
          }
          .demo-anthropic-scope p,
          .demo-anthropic-scope li,
          .demo-anthropic-scope blockquote {
            font-family: "Source Serif 4", Georgia, serif !important;
          }
          /* UI-element (knappar, badges, inputs) ska behålla sans */
          .demo-anthropic-scope button,
          .demo-anthropic-scope input,
          .demo-anthropic-scope select,
          .demo-anthropic-scope textarea,
          .demo-anthropic-scope label,
          .demo-anthropic-scope [role="button"] {
            font-family: "Inter Tight", "Inter", system-ui, sans-serif !important;
          }
        `}</style>
        <LandingV2 />
      </div>
    </>
  );
}
