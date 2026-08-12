import type { ComponentType } from "react";
import { Link } from "@/lib/router-compat";
import type { SceneProps } from "@/components/animationer";

type Ton = "ljus" | "mork";

export type AnimationSektionProps = {
  /** Animationskomponenten som ska visas. */
  Animation: ComponentType<SceneProps>;
  /** Liten etikett över rubriken. */
  etikett: string;
  rubrik: string;
  brodtext: string;
  /** Tre korta punkter under brödtexten. */
  punkter: string[];
  /** Länktext + mål, valfritt. */
  cta?: { text: string; till: string };
  ton?: Ton;
  /** Lägg animationen till vänster istället för höger (desktop). */
  omvand?: boolean;
};

const FARGER = {
  ljus: {
    bakgrund: "#f5f5f7",
    kant: "#e3e3e8",
    etikett: "#7a7a85",
    rubrik: "#0b0c10",
    text: "#4a4a55",
    punkt: "#1a1b22",
    ram: "#e3e3e8",
  },
  mork: {
    bakgrund: "#0b0c10",
    kant: "#22232b",
    etikett: "#6f7178",
    rubrik: "#ffffff",
    text: "#b8bac2",
    punkt: "#e6e7ec",
    ram: "#22232b",
  },
} as const;

export default function AnimationSektion({
  Animation,
  etikett,
  rubrik,
  brodtext,
  punkter,
  cta,
  ton = "ljus",
  omvand = false,
}: AnimationSektionProps) {
  const c = FARGER[ton];

  return (
    <section
      style={{ background: c.bakgrund, borderBottom: `1px solid ${c.kant}` }}
      className="px-5 py-16 sm:px-8 md:py-20"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className={omvand ? "md:order-2" : undefined}>
          <p
            className="mb-3 text-[11px] uppercase"
            style={{ letterSpacing: "0.18em", color: c.etikett, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {etikett}
          </p>
          <h2
            className="mb-4 text-[26px] font-bold leading-[1.15] tracking-tight sm:text-[32px]"
            style={{ color: c.rubrik }}
          >
            {rubrik}
          </h2>
          <p className="mb-6 max-w-[520px] text-[15px] leading-relaxed" style={{ color: c.text }}>
            {brodtext}
          </p>
          <ul className="mb-7 space-y-2.5">
            {punkter.map((p) => (
              <li key={p} className="flex gap-3 text-[14px] leading-snug" style={{ color: c.punkt }}>
                <span aria-hidden style={{ color: "#00d2e6" }}>
                  ·
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          {cta ? (
            <Link
              to={cta.till}
              className="inline-flex items-center rounded-full text-sm font-semibold px-6 py-3 transition-opacity hover:opacity-85"
              style={{
                background: ton === "mork" ? "#ffffff" : "#0b0c10",
                color: ton === "mork" ? "#0b0c10" : "#ffffff",
              }}
            >
              {cta.text}
            </Link>
          ) : null}
        </div>

        <div className={omvand ? "md:order-1" : undefined}>
          <div
            className="overflow-hidden"
            style={{ borderRadius: 16, border: `1px solid ${c.ram}` }}
          >
            <Animation variant="site" radius={16} />
          </div>
        </div>
      </div>
    </section>
  );
}
