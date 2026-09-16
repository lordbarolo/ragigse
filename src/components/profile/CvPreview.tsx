import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";

// Renderad förhandsvisning av CV-utkastet i det mörka profiltemat.
// Egen komponentmappning istället för prose-klasser — @tailwindcss/typography
// är inte registrerat i Tailwind v4-CSS:en och globala stilfiler ska inte röras.
// CV:ts rubriker renderas en nivå ned (h2–h4) eftersom sidan redan har en h1.
const components: Components = {
  h1: ({ children }) => (
    <h2 className="text-lg font-semibold tracking-tight text-white">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mt-6 border-b border-white/10 pb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-white/90 first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="mt-4 text-sm font-semibold text-white/85">{children}</h4>
  ),
  h4: ({ children }) => <h4 className="mt-4 text-sm font-semibold text-white/85">{children}</h4>,
  h5: ({ children }) => <h4 className="mt-4 text-sm font-semibold text-white/85">{children}</h4>,
  h6: ({ children }) => <h4 className="mt-4 text-sm font-semibold text-white/85">{children}</h4>,
  p: ({ children }) => (
    <p className="mt-2 text-sm leading-relaxed text-white/70">{children}</p>
  ),
  ul: ({ children }) => <ul className="mt-2 space-y-1 pl-1">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 space-y-1 pl-1">{children}</ol>,
  li: ({ children }) => (
    <li className="flex gap-2 text-sm leading-relaxed text-white/70">
      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-white/40" aria-hidden />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white/90">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/75">{children}</em>,
  hr: () => <hr className="my-4 border-white/10" />,
  a: ({ children }) => <span className="text-white/80 underline">{children}</span>,
  code: ({ children }) => <span className="text-white/80">{children}</span>,
};

/**
 * Enkla radbrytningar blir hårda brytningar, så att förhandsvisningen visar
 * samma radindelning som PDF- och DOCX-exporten (som tolkar varje rad för sig).
 * Utan detta slår Markdown ihop t.ex. "Legitimation — 2012" och "B-körkort" till en rad.
 */
function withHardBreaks(markdown: string): string {
  return markdown.replace(/([^\n])\n(?=[^\n])/g, "$1  \n");
}

interface Props {
  markdown: string;
  className?: string;
  /** Egen inre scroll. Stäng av i arbetsytan så vyn scrollar med sidan. */
  scroll?: boolean;
}

/** Renderad Markdown-vy för CV-utkast (rubriker, listor — inte rå text). */
export default function CvPreview({ markdown, className, scroll = true }: Props) {
  const rendered = useMemo(() => withHardBreaks(markdown), [markdown]);
  return (
    <div
      className={
        (scroll ? "max-h-96 overflow-auto " : "") +
        "rounded-xl border border-white/10 bg-black/40 px-5 py-4 " +
        (className ?? "")
      }
    >
      <ReactMarkdown components={components}>{rendered}</ReactMarkdown>
    </div>
  );
}
