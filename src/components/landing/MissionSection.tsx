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
...
            subtitle="Vårdkonsulter"
            body="Hitta rätt uppdrag. Bygg din karriär. Arbeta på dina villkor."
            cta="Jag är konsult"
            href="/registrera"
          />
          <MissionCard
            play={cardsInView}
            icon={<Building2 className="w-5 h-5 text-[#7DB4FF]" strokeWidth={1.75} />}
            iconBg="bg-blue-500/10 border-blue-400/30"
            count={500}
            suffix="+"
            subtitle="Ledande vårdgivare"
            body="Tillsätt pass snabbare. Minska kostnader. Optimera personalstyrkan."
            cta="Jag är bemanningsbolag"
            href="/for-bemanningsforetag"
          />
        </div>
      </div>
    </section>
  );
}
