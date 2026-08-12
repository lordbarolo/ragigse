import ReactMarkdown, { type Components } from "react-markdown";

// Renderad förhandsvisning av CV-utkastet i det mörka profiltemat.
// Egen komponentmappning istället för prose-klasser — @tailwindcss/typography
// är inte registrerat i Tailwind v4-CSS:en och globala stilfiler ska inte röras.
const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold tracking-tight text-white">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 border-b border-white/10 pb-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-white/90 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 text-sm font-semibold text-white/85">{children}</h3>
  ),
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

interface Props {
  markdown: string;
  className?: string;
}

/** Renderad Markdown-vy för CV-utkast (rubriker, listor — inte rå text). */
export default function CvPreview({ markdown, className }: Props) {
  return (
    <div
      className={
        "max-h-96 overflow-auto rounded-xl border border-white/10 bg-black/40 px-5 py-4 " +
        (className ?? "")
      }
    >
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}
