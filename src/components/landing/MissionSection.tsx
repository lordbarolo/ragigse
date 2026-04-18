import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowRight, Stethoscope, Building2 } from "lucide-react";

/* ───────────────────── Animated counter ───────────────────── */
function Counter({ to, suffix = "", play }: { to: number; suffix?: string; play: boolean }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v).toLocaleString("sv-SE")}${suffix}`);
  const [display, setDisplay] = useState(`0${suffix}`);

  useEffect(() => {
    if (!play) return;
    const controls = animate(count, to, {
      duration: 1.8,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => {
      controls.stop();
      unsub();
    };
  }, [play, to, count, rounded, suffix]);

  return <span>{display}</span>;
}

/* ───────────────────── Mission card ───────────────────── */
type CardProps = {
  icon: React.ReactNode;
  count: number;
  suffix: string;
  subtitle: string;
  body: string;
  cta: string;
  href: string;
  play: boolean;
};

function MissionCard({ icon, count, suffix, subtitle, body, cta, href, play }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="group relative rounded-3xl bg-[#0F1A2E]/95 border border-white/10 p-8 md:p-10 transition-all duration-200 hover:border-[#7C9BFF]/60 hover:shadow-[0_0_60px_-10px_rgba(124,155,255,0.55)]"
    >
      {/* subtle inner gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent" />

      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-8 transition-colors duration-200 group-hover:bg-white/[0.1] group-hover:border-white/20">
          {icon}
        </div>

        <p className="text-[11px] tracking-[0.2em] font-semibold text-white/40 mb-2">JOIN</p>
        <h3 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-none mb-2">
          <Counter to={count} suffix={suffix} play={play} />
        </h3>
        <p className="text-lg font-medium text-white/80 mb-6">{subtitle}</p>

        <p className="text-white/55 text-[15px] leading-relaxed mb-8 max-w-[26ch]">{body}</p>

        <Link
          to={href}
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 group-hover:bg-white group-hover:text-[#0F1A2E] group-hover:border-white"
        >
          {cta}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ───────────────────── Section ───────────────────── */
export default function MissionSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const cardsInView = useInView(cardsRef, { once: true, margin: "-100px" });

  return (
    <section ref={sectionRef} className="relative bg-[#F2F1F8] py-24 md:py-36 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header reveal */}
        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-16 md:mb-20"
        >
          Vilket uppdrag väljer du?
        </motion.h2>

        {/* Cards */}
        <div ref={cardsRef} className="grid md:grid-cols-2 gap-6 md:gap-8">
          <MissionCard
            play={cardsInView}
            icon={<Stethoscope className="w-5 h-5 text-white/80" strokeWidth={1.5} />}
            count={50000}
            suffix="+"
            subtitle="Vårdens hjältar"
            body="Hitta uppdrag. Bygg din karriär. Jobba på dina villkor."
            cta="Jag är konsult"
            href="/registrera"
          />
          <MissionCard
            play={cardsInView}
            icon={<Building2 className="w-5 h-5 text-white/80" strokeWidth={1.5} />}
            count={500}
            suffix="+"
            subtitle="Ledande verksamheter"
            body="Tillsätt uppdrag snabbare. Sänk kostnader. Optimera arbetskraften."
            cta="Jag är uppdragsgivare"
            href="/for-bemanningsforetag"
          />
        </div>

        {/* Subtle hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-14"
        >
          ↓ eller scrolla för att utforska båda ↓
        </motion.p>
      </div>
    </section>
  );
}
