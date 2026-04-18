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
  accent: "teal" | "blue";
};

function MissionCard({ icon, iconBg, count, suffix, subtitle, body, cta, href, play, accent }: CardProps) {
  const accentColors = {
    teal: {
      glow: "hover:shadow-[0_0_60px_rgba(94,234,212,0.25),0_0_120px_rgba(94,234,212,0.15),inset_0_0_40px_rgba(94,234,212,0.05)]",
      border: "hover:border-teal-300/40",
      titleGradient: "bg-gradient-to-b from-white to-teal-200/90 bg-clip-text text-transparent",
      buttonBg: "bg-teal-300/90 hover:bg-teal-200 text-slate-900",
      ambient: "bg-[radial-gradient(circle_at_50%_0%,rgba(94,234,212,0.18),transparent_60%)]",
    },
    blue: {
      glow: "hover:shadow-[0_0_60px_rgba(125,180,255,0.2),0_0_120px_rgba(125,180,255,0.1),inset_0_0_40px_rgba(125,180,255,0.04)]",
      border: "hover:border-blue-300/30",
      titleGradient: "bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent",
      buttonBg: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
      ambient: "bg-[radial-gradient(circle_at_50%_0%,rgba(125,180,255,0.12),transparent_60%)]",
    },
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`group relative rounded-3xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/[0.08] p-8 md:p-10 transition-all duration-500 ${accentColors.border} ${accentColors.glow} shadow-[0_0_30px_rgba(0,0,0,0.4)] backdrop-blur-sm`}
    >
      {/* radial inner gradient */}
      <div className={`pointer-events-none absolute inset-0 rounded-3xl ${accentColors.ambient} opacity-60`} />

      <div className="relative">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border ${iconBg} shadow-lg`}
        >
          {icon}
        </div>

        <p className="text-[11px] tracking-[0.2em] font-semibold text-white/40 mb-3">ANSLUT</p>
        <h3 className={`text-6xl md:text-7xl font-bold tracking-tight leading-none mb-3 ${accentColors.titleGradient}`}>
          <Counter to={count} suffix={suffix} play={play} />
        </h3>
        <p className="text-lg font-medium text-white/85 mb-6">{subtitle}</p>

        <p className="text-white/55 text-[15px] leading-relaxed mb-8 max-w-[32ch]">{body}</p>

        <Link
          to={href}
          className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ${accentColors.buttonBg}`}
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
      className="relative bg-gradient-to-b from-[#020617] via-[#071330] to-[#0A0A0A] py-24 md:py-36 px-6 overflow-hidden"
    >
      {/* Star field */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 80% 20%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 90% 60%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 10% 60%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 45% 15%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 75% 85%, rgba(255,255,255,0.4), transparent)",
          backgroundSize: "600px 600px",
        }}
      />

      {/* Strong ambient glow ring around cards */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[1100px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(94,234,212,0.14),rgba(83,74,183,0.08)_40%,transparent_70%)] blur-3xl" />

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
            accent="teal"
            icon={<Stethoscope className="w-6 h-6 text-teal-300" strokeWidth={1.75} />}
            iconBg="bg-teal-400/10 border-teal-300/30"
            count={500}
            suffix="+"
            subtitle="Smarta vårdkonsulter"
            body="Hitta rätt uppdrag. Bygg din karriär. Arbeta på dina villkor."
            cta="Jag jobbar i vården"
            href="/registrera"
          />
          <MissionCard
            play={cardsInView}
            accent="blue"
            icon={<Building2 className="w-6 h-6 text-blue-300" strokeWidth={1.75} />}
            iconBg="bg-blue-500/10 border-blue-400/30"
            count={100}
            suffix="+"
            subtitle="Ledande uppdragsgivare"
            body="Dela papper utan att bifoga, använd befintliga & verifierade referenser"
            cta="Jag bemannar vården"
            href="/for-bemanningsforetag"
          />
        </div>

        {/* Scroll hint */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center text-xs tracking-wider text-white/40 mt-12"
        >
          ↓ eller scrolla för att utforska båda ↓
        </motion.p>
      </div>
    </section>
  );
}
