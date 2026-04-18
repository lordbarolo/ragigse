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
  iconBg: string;
  count: number;
  suffix: string;
  subtitle: string;
  body: string;
  cta: string;
  href: string;
  play: boolean;
};

function MissionCard({ icon, iconBg, count, suffix, subtitle, body, cta, href, play }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.05 }}
      className="group relative rounded-3xl bg-white/[0.02] border border-[#1A1A1A] p-8 md:p-10 transition-[border-color,box-shadow] duration-[250ms] hover:border-[#534AB7] hover:shadow-[0_0_25px_rgba(83,74,183,0.4)]"
    >
      {/* subtle inner gradient */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent" />

      <div className="relative">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center mb-8 border ${iconBg}`}
        >
          {icon}
        </div>

        <p className="text-[11px] tracking-[0.2em] font-semibold text-white/40 mb-2">ANSLUT</p>
        <h3 className="text-5xl md:text-6xl font-bold text-white tracking-tight leading-none mb-2">
          <Counter to={count} suffix={suffix} play={play} />
        </h3>
        <p className="text-lg font-medium text-white/80 mb-6">{subtitle}</p>

        <p className="text-white/55 text-[15px] leading-relaxed mb-8 max-w-[28ch]">{body}</p>

        <Link
          to={href}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white hover:text-[#0A0A0A] hover:border-white"
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
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="relative bg-[#0A0A0A] py-24 md:py-36 px-6 overflow-hidden"
    >
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-[#534AB7]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-blue-500/5 blur-[120px]" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header reveal */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-16 md:mb-20"
        >
          Vilken är din mission?
        </motion.h2>

        {/* Cards */}
        <div ref={cardsRef} className="grid md:grid-cols-2 gap-6 md:gap-8">
          <MissionCard
            play={cardsInView}
            icon={<Stethoscope className="w-5 h-5 text-[#A89BFF]" strokeWidth={1.75} />}
            iconBg="bg-[#534AB7]/15 border-[#534AB7]/30"
            count={500}
            suffix="+"
            subtitle="Smarta vårdkonsulter"
            body="Hitta rätt uppdrag. Bygg din karriär. Arbeta på dina villkor."
            cta="Jag jobbar i vården"
            href="/registrera"
          />
          <MissionCard
            play={cardsInView}
            icon={<Building2 className="w-5 h-5 text-[#7DB4FF]" strokeWidth={1.75} />}
            iconBg="bg-blue-500/10 border-blue-400/30"
            count={100}
            suffix="+"
            subtitle="Ledande uppdragsgivare"
            body="Dela papper utan att bifoga, använd befintliga & verifierade referenser"
            cta="Jag är bemanningsbolag"
            href="/for-bemanningsforetag"
          />
        </div>
      </div>
    </section>
  );
}
