import serviceLoneanalys from "@/assets/service-loneanalys.jpg";
import fakturaScreen from "@/assets/faktura-screen.png";
import referenserScreen from "@/assets/referenser-screen.png";

const SERVICES = [
  {
    image: serviceLoneanalys,
    title: "Ersättningsanalys",
    desc: "Vill du veta om du har rätt ersättning? Vi har svaret.\nBaserat på omfattande dataanalys och branschens marginaler kan vi ge dig beslutsunderlag för löneförhandling redan idag.",
    cta: "Starta analys",
    isPhone: false,
  },
  {
    image: fakturaScreen,
    title: "Fakturakontroll",
    desc: "Pengarna du inte visste att du saknade. Konsulter missar att fakturera för i snitt 30 000kr per år.\nSe om du har pengar att hämta.",
    cta: "Läs mer",
    isPhone: true,
  },
  {
    image: serviceDokument,
    title: "Referenser & Verify",
    desc: "Ta kontroll över dina referenser och intyg. Ladda upp handlingarna och ge tidsbegränsad tillgång till utvalda personer. Spårbart, säkert och på dina villkor.",
    cta: "Läs mer",
    isPhone: false,
  },
];

interface ServiceCardsProps {
  onStartAnalysis: () => void;
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex justify-center mb-4">
      <div className="relative mx-auto" style={{ maxWidth: 260 }}>
        {/* Outer shell */}
        <div className="bg-foreground/10 rounded-[2.4rem] p-[8px] shadow-2xl">
          {/* Inner bezel */}
          <div className="bg-card rounded-[2rem] overflow-hidden relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90px] h-[22px] bg-foreground/10 rounded-b-xl z-10" />
            {/* Screen */}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="w-full h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceCards({ onStartAnalysis }: ServiceCardsProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-10">
          Allt du behöver som vårdkonsult
        </h2>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-6 pb-4 max-w-6xl mx-auto">
        {SERVICES.map((s, i) => (
          <button
            key={i}
            onClick={onStartAnalysis}
            className="snap-start shrink-0 w-[80vw] max-w-[420px] text-left group"
          >
            {s.isPhone ? (
              <PhoneFrame src={s.image} alt={s.title} />
            ) : (
              <div className="rounded-2xl overflow-hidden mb-4">
                <img
                  src={s.image}
                  alt={s.title}
                  loading="lazy"
                  width={640}
                  height={800}
                  className="w-full h-auto object-cover aspect-[4/5] group-hover:scale-[1.02] transition-transform duration-300"
                />
              </div>
            )}

            {/* Text */}
            <h3 className="text-lg font-bold text-foreground mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3 whitespace-pre-line">{s.desc}</p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              {s.cta} <span aria-hidden>→</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
