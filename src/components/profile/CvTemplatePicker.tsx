import type { CvTemplate } from "@/lib/cvTemplates";

interface Props {
  templates: CvTemplate[];
  value: string;
  onChange: (slug: string) => void;
}

/** Miniatyr som ritas i CSS utifrån mallens designvärden — ingen bildfil behövs. */
function Thumb({ template }: { template: CvTemplate }) {
  const d = template.design;
  const accent = `#${d.accent}`;
  const rule = `#${d.rule}`;
  const gap = d.lineFactor < 1.4 ? 3 : 5;
  const pad = Math.round(d.margin / 8);

  return (
    <div
      className="aspect-[1/1.414] w-full overflow-hidden rounded-md bg-white"
      style={{ padding: pad }}
      aria-hidden="true"
    >
      <div
        style={{
          height: Math.max(4, d.h1 / 3),
          width: "62%",
          background: accent,
          borderRadius: 1,
          fontFamily: d.fontPdf === "times" ? "serif" : "sans-serif",
        }}
      />
      <div style={{ marginTop: gap }}>
        {[92, 78].map((w) => (
          <div
            key={w}
            style={{ height: 2, width: `${w}%`, background: "#D4D4D8", marginTop: 2 }}
          />
        ))}
      </div>
      {[0, 1, 2].map((s) => (
        <div key={s} style={{ marginTop: gap + 3 }}>
          <div
            style={{
              height: Math.max(3, d.h2 / 4),
              width: `${34 + s * 6}%`,
              background: accent,
              opacity: 0.9,
              borderRadius: 1,
            }}
          />
          {d.showRule && (
            <div style={{ height: 1, width: "100%", background: rule, marginTop: 2 }} />
          )}
          {[96, 88, 70].map((w) => (
            <div
              key={w}
              style={{ height: 2, width: `${w}%`, background: "#E4E4E7", marginTop: 2 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Val av CV-design. Designerna kommer från databasen och gäller både PDF och Word. */
export default function CvTemplatePicker({ templates, value, onChange }: Props) {
  if (templates.length === 0) return null;

  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Design</p>
      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        {templates.map((t) => {
          const selected = t.slug === value;
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => onChange(t.slug)}
              aria-pressed={selected}
              className={`rounded-xl border p-2 text-left transition-colors ${
                selected
                  ? "border-white/60 bg-white/[0.06]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <Thumb template={t} />
              <span className="mt-2 block text-xs font-medium text-white">{t.name}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-white/45">
                {t.description}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-white/35">
        Designen används i både PDF och Word. Texten förblir läsbar för rekryteringssystem.
      </p>
    </div>
  );
}
