import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface ServiceCarouselProps {
  onStartAnalysis: () => void;
}

const SERVICES = [
  {
    title: "Förhandlar du rätt?",
    desc: "Se exakt var du ligger i förhållande till marknaden baserat på din kompetens.",
    cta: "Testa agenten",
    iconBg: "bg-violet-500/10",
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
        <path d="M10 3v4M6 5l2 3M14 5l-2 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="4" y="10" width="12" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M8 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    iconColor: "text-violet-400",
    link: "/forhandla",
  },
  {
    title: "Tjänar du rätt?",
    desc: "Se vad du kan tjäna baserat på regionernas ramavtalspriser.",
    cta: "Starta analys",
    iconBg: "bg-blue-500/10",
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 9h6M7 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 17l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconColor: "text-blue-400",
    link: null,
  },
  {
    title: "Fakturerar du rätt?",
    desc: "Säkerställ att du inte missar tillägg, OB eller jourersättning.",
    cta: "Granska din faktura",
    iconBg: "bg-emerald-500/10",
    icon: (
      <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M7 4V3M13 4V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    iconColor: "text-emerald-400",
    link: "/fakturakontroll",
  },
];

export default function ServiceCarousel({ onStartAnalysis }: ServiceCarouselProps) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isScrolling.current) return;
    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.offsetWidth;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(newIndex, SERVICES.length - 1));
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    isScrolling.current = true;
    const cardWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({ left: cardWidth * index, behavior: "smooth" });
    setActiveIndex(index);
    setTimeout(() => { isScrolling.current = false; }, 400);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <section className="py-12 md:py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground mb-2">
          Plattformen
        </p>
        <h2 className="text-2xl font-medium text-foreground mb-6">
          Tre frågor. Ett svar.
        </h2>

        {/* Mobile: horizontal snap carousel */}
        <div className="sm:hidden">
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide gap-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {SERVICES.map((s, i) => (
              <div
                key={i}
                className="snap-center shrink-0 w-full px-1"
              >
                <div className="rounded-2xl bg-card border border-border p-6 flex flex-col min-h-[220px]">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${s.iconBg} ${s.iconColor}`}>
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">{s.desc}</p>
                  <button
                    onClick={() => s.link ? navigate(s.link) : onStartAnalysis()}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer bg-transparent w-fit"
                  >
                    {s.cta} <span aria-hidden>→</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-5">
            {SERVICES.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                aria-label={`Visa kort ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-6 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop: grid like before */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-4">
          {SERVICES.map((s, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-8 flex flex-col">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${s.iconBg} ${s.iconColor}`}>
                {s.icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">{s.desc}</p>
              <button
                onClick={() => s.link ? navigate(s.link) : onStartAnalysis()}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer bg-transparent w-fit"
              >
                {s.cta} <span aria-hidden>→</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
