import type { ReactNode } from "react";
import { heroBackgroundStyle } from "@/lib/heroBackground";

/**
 * Anthropic-inspirerat scope: varm bakgrund (#0b0c10 + mesh) +
 * Inter Tight 800-rubriker + Source Serif 4 brödtext.
 *
 * Lägg som rotomslutning runt en sida för att applicera samma look som / och /demo.
 * Mörka kortytor som ska behålla vit text markeras med `data-dark-surface`.
 *
 * @param roomySections – tvinga 80/128px vertikal padding på <section>. Default false.
 */
export default function AnthropicScope({
  children,
  roomySections = false,
}: {
  children: ReactNode;
  roomySections?: boolean;
}) {
  return (
    <div
      className="demo-anthropic-scope"
      style={
        {
          ["--font-display" as any]:
            '"Inter Tight", "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          ["--font-body" as any]:
            '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif',
          ...heroBackgroundStyle,
          minHeight: "100vh",
        } as React.CSSProperties
      }
    >
      <style>{`
        /* ── Bakgrund: tvinga #0b0c10 över hela scopet ── */
        .demo-anthropic-scope,
        .demo-anthropic-scope .bg-black,
        .demo-anthropic-scope [class*="bg-slate-"],
        .demo-anthropic-scope [class*="bg-neutral-"],
        .demo-anthropic-scope [class*="bg-zinc-"],
        .demo-anthropic-scope [class*="bg-gray-"] {
          background-color: #0b0c10 !important;
        }

        /* ── Rubriker: Inter Tight 800, svart, tight tracking ── */
        .demo-anthropic-scope h1,
        .demo-anthropic-scope h2,
        .demo-anthropic-scope h3,
        .demo-anthropic-scope h4,
        .demo-anthropic-scope h5,
        .demo-anthropic-scope h6 {
          font-family: "Inter Tight", "Inter", system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          color: #000000 !important;
          font-weight: 800 !important;
          letter-spacing: -0.035em;
          line-height: 1.05;
        }
        .demo-anthropic-scope h1 {
          letter-spacing: -0.045em;
          line-height: 1.0;
        }

        .demo-anthropic-scope .text-gradient-violet {
          background: none !important;
          -webkit-text-fill-color: #000000 !important;
          color: #000000 !important;
        }

        /* ── Brödtext: Source Serif 4, svart ── */
        .demo-anthropic-scope,
        .demo-anthropic-scope p,
        .demo-anthropic-scope li,
        .demo-anthropic-scope blockquote {
          font-family: "Source Serif 4", "Source Serif Pro", Georgia,
            "Times New Roman", serif;
        }
        .demo-anthropic-scope p,
        .demo-anthropic-scope li,
        .demo-anthropic-scope blockquote {
          color: #000000;
          font-weight: 400;
        }

        /* ── Sekundär text / labels / eyebrows: liten sans-serif ── */
        .demo-anthropic-scope label,
        .demo-anthropic-scope small,
        .demo-anthropic-scope figcaption,
        .demo-anthropic-scope .eyebrow,
        .demo-anthropic-scope [data-eyebrow],
        .demo-anthropic-scope .uppercase {
          font-family: "Inter Tight", "Inter", system-ui, sans-serif !important;
          color: #555555 !important;
        }

        /* UI-element (knappar/inputs) i sans-serif */
        .demo-anthropic-scope button,
        .demo-anthropic-scope input,
        .demo-anthropic-scope select,
        .demo-anthropic-scope textarea,
        .demo-anthropic-scope [role="button"] {
          font-family: "Inter Tight", "Inter", system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        }

        /* ── Undantag: mörka ytor behåller vit text ── */
        .demo-anthropic-scope [data-dark-surface],
        .demo-anthropic-scope [data-dark-surface] *,
        .demo-anthropic-scope [data-dark-surface] h1,
        .demo-anthropic-scope [data-dark-surface] h2,
        .demo-anthropic-scope [data-dark-surface] h3,
        .demo-anthropic-scope [data-dark-surface] h4,
        .demo-anthropic-scope [data-dark-surface] h5,
        .demo-anthropic-scope [data-dark-surface] h6,
        .demo-anthropic-scope [data-dark-surface] p,
        .demo-anthropic-scope [data-dark-surface] li,
        .demo-anthropic-scope [data-dark-surface] label,
        .demo-anthropic-scope [data-dark-surface] span {
          color: #FFFFFF !important;
        }
        .demo-anthropic-scope [data-dark-surface] .text-white\\/40,
        .demo-anthropic-scope [data-dark-surface] [class*="text-white/"] {
          color: rgba(255,255,255,0.6) !important;
        }

        ${roomySections ? `
        .demo-anthropic-scope section:not([data-no-roomy]) {
          padding-top: 80px !important;
          padding-bottom: 80px !important;
        }
        @media (min-width: 768px) {
          .demo-anthropic-scope section:not([data-no-roomy]) {
            padding-top: 80px !important;
            padding-bottom: 80px !important;
          }
        }
        ` : ``}
      `}</style>
      {children}
    </div>
  );
}
