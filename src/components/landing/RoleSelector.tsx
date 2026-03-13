interface Props {
  onRoleSelect: (category: "lakare" | "ssk", prefill?: string) => void;
}

const ROLES = [
  { icon: "🩺", title: "Läkare", sub: "ST-läkare, specialist eller legitimerad läkare", category: "lakare" as const },
  { icon: "💉", title: "Sjuksköterska", sub: "Allmänsjuksköterska eller specialistsjuksköterska", category: "ssk" as const },
  { icon: "👶", title: "Barnmorska", sub: "Legitimerad med specialistutbildning", category: "ssk" as const, prefill: "__barnmorska" },
];

export default function RoleSelector({ onRoleSelect }: Props) {
  return (
    <section id="roles" className="py-20 px-6 max-w-[1080px] mx-auto">
      <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.1] text-center mb-3.5" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
        Välj din roll
      </h2>
      <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[480px] mx-auto text-center mb-12">
        Vad jobbar du som? Välj din yrkeskategori så hämtar vi rätt ramavtalspriser och sätter ihop din rapport.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[720px] mx-auto">
        {ROLES.map((r) => (
          <button
            key={r.title}
            onClick={() => onRoleSelect(r.category, r.prefill)}
            className="group relative overflow-hidden flex items-center gap-5 bg-[hsl(var(--dark-2))] border border-foreground/[0.12] rounded-[20px] p-7 pl-6 text-left cursor-pointer transition-all hover:border-primary/40 hover:bg-[hsl(var(--dark-3))] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3),0_0_0_1px_hsl(196_100%_50%/0.1)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 w-14 h-14 rounded-[14px] bg-primary/10 border border-primary/15 flex items-center justify-center text-[26px] flex-shrink-0">
              {r.icon}
            </div>
            <div className="relative z-10 flex-1">
              <div className="font-display text-lg font-bold tracking-[-0.02em] mb-1">{r.title}</div>
              <div className="text-[13px] text-foreground/65 leading-snug">{r.sub}</div>
            </div>
            <span className="relative z-10 text-primary text-xl flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        ))}
      </div>

      <div className="text-center text-xs text-foreground/35 mt-5 flex items-center justify-center gap-4">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Anonymt — vi sparar inga personuppgifter
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Klart på under 60 sekunder
        </span>
      </div>
    </section>
  );
}
