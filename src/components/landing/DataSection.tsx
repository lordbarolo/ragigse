const CARDS = [
  {
    icon: "📋",
    title: "SKR Ramavtal RS 202203983",
    desc: "Nationellt hyrbemanningsavtal för sjuksköterskor och läkare. Grundpriser, OB-tariffer och reseschablon för alla 21 regioner.",
    source: "Giltig 2026-01-01–2026-12-31",
  },
  {
    icon: "📊",
    title: "SCB & Medlingsinstitutet",
    desc: "Lönestatistik (p25/p50/p75) per yrkeskategori och sektor. Samma data som arbetsgivare och fackförbund använder i löneförhandlingar.",
    source: "Källa: Medlingsinstitutet 2024",
  },
  {
    icon: "🗺",
    title: "Geografisk zonindelning",
    desc: "Tre prisnivåer baserade på regionens geografiska läge. Zon 1 inkluderar storstadsregioner, zon 3 avlägsna regioner med svårare rekrytering.",
    source: "Källa: SKR",
  },
  {
    icon: "👩‍⚕️",
    title: "Socialstyrelsens yrkeskoder",
    desc: "Yrkeskategorier och specialistinriktningar enligt Socialstyrelsens nationella yrkeskodverk — samma klassificering som används i ramavtalet.",
    source: "Källa: Socialstyrelsen",
  },
];

export default function DataSection() {
  return (
    <section id="data" className="py-20 md:py-[100px] px-6 md:px-10 max-w-[1080px] mx-auto">
      <p className="font-display text-sm md:text-[11px] font-semibold tracking-[0.14em] uppercase text-primary mb-3.5">
        Om datan
      </p>
      <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.1] mb-3.5" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
        Vi gör informationen tillgänglig för alla
      </h2>
      <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[540px]">
        Prisuppgifter och avtalsdata har länge varit information som begränsats till en liten krets. Vi ändrar på det.
      </p>
      <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[540px] mt-3">
        Med hjälp av modern teknik har vi analyserat hundratals avtal och avrop. För första gången är informationen paketerad för att nå läkare och sjuksköterskor.
      </p>
      <p className="text-base md:text-sm text-foreground/50 italic leading-relaxed max-w-[540px] mt-4">
        "Vad betalar Region Skåne för en infektionssjuksköterska? Hur skiljer sig Zon 1 mot Zon 3? Hur mycket har priserna ändrats sedan förra avtalsperioden?"
      </p>
      <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[540px] mt-3">
        Ställ frågan till <span className="font-semibold text-foreground">Löneassistenten</span> — din AI-assistent med tillgång till all avtalsdata.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-12">
        {CARDS.map((c, i) => (
          <div key={i} className="bg-[hsl(var(--dark-2))] border border-foreground/[0.07] rounded-[20px] p-7 hover:border-foreground/[0.12] transition-colors">
            <div className="text-[28px] mb-4">{c.icon}</div>
            <h3 className="font-display text-base font-bold tracking-[-0.02em] mb-2">{c.title}</h3>
            <p className="text-sm text-foreground/65 leading-relaxed">{c.desc}</p>
            <span className="inline-block mt-3.5 text-[11px] font-display font-semibold text-primary tracking-wider uppercase">
              {c.source}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
