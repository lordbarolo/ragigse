import { useNavigate } from "react-router-dom";

interface ServiceCardsProps {
  onStartAnalysis: () => void;
}

const SERVICES = [
  {
    title: "Förhandlingsagent",
    desc: "AI-driven rådgivning som hjälper dig förbereda och genomföra löneförhandlingar med konkreta argument baserade på marknadsdata.",
    cta: "Testa agenten",
    iconBg: "bg-violet-500/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v4M6 5l2 3M14 5l-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="4" y="10" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    iconColor: "text-violet-500",
    link: "/forhandla",
  },
  {
    title: "Ersättningsanalys",
    desc: "Vill du veta om du har rätt ersättning? Vi har svaret. Baserat på omfattande analyser av avtal och branschens marginaler kan vi ge konsulter beslutsunderlag som tidigare saknats.",
    cta: "Starta analys",
    iconBg: "bg-blue-500/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 17l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconColor: "text-blue-500",
    link: null,
  },
  {
    title: "Fakturakontroll",
    desc: "Pengarna du inte visste att du saknade. Konsulter missar att fakturera för i snitt 30 000 kr per år. Se om du har pengar att hämta.",
    cta: "Läs mer",
    iconBg: "bg-emerald-500/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 4V3M13 4V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconColor: "text-emerald-500",
    link: "/fakturakontroll",
  },
  {
    title: "Referenser & Verifikationer",
    desc: "Ta kontroll över dina referenser och intyg. Dela handlingarna och ge tidsbegränsad tillgång till relevanta personer. Spårbart, säkert och på dina villkor.",
    cta: "Kommer snart",
    iconBg: "bg-amber-500/10",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M4 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M15 5l1.5-1.5M16.5 7H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    iconColor: "text-amber-500",
    comingSoon: true,
  },
];

export default function ServiceCards({ onStartAnalysis }: ServiceCardsProps) {
  const navigate = useNavigate();

  return (
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Plattformen
        </p>
        <h2 className="text-[22px] font-medium text-foreground mb-8">
          Upptäck Compcare
        </h2>

        {/* Grid with 1px gap lines */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
          {SERVICES.map((s, i) => (
            <div key={i} className={`bg-background p-8 flex flex-col ${(s as any).comingSoon ? 'opacity-50' : ''}`}>
              {/* Icon */}
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-5 ${s.iconBg} ${s.iconColor}`}
              >
                {s.icon}
              </div>

              <h3 className="text-base font-medium text-foreground mb-3">
                {s.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-6">
                {s.desc}
              </p>

              {(s as any).comingSoon ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground w-fit">
                  {s.cta}
                </span>
              ) : (
                <button
                  onClick={() => (s as any).link ? navigate((s as any).link) : onStartAnalysis()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground border-b border-border pb-px w-fit hover:border-foreground transition-colors cursor-pointer bg-transparent"
                >
                  {s.cta} <span aria-hidden>→</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}