import { Link } from "@/lib/router-compat";
import type { ReactNode } from "react";

type Variant = "steel" | "ghost";

/**
 * CTA i namnskyltsformat — metallisk ram, mörk borstad insida, litet emblem
 * och spärrad versaltext. Inspirerad av vårdpersonalens skylt på scrubs,
 * men nedtonad: inga titelrader, ingen klämma, ingen streckkod.
 */
export default function BadgeCta({
  to,
  children,
  variant = "steel",
  onClick,
  ariaLabel,
}: {
  to: string;
  children: ReactNode;
  variant?: Variant;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  const steel = variant === "steel";

  return (
    <Link
      to={to}
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative inline-flex select-none p-[1.5px] transition-transform duration-200 active:scale-[0.985]"
      style={{
        borderRadius: 9,
        background: steel
          ? "linear-gradient(180deg,#f2f3f5 0%,#b9bcc4 26%,#6f727b 62%,#d7d9df 100%)"
          : "linear-gradient(180deg,#4a4d57 0%,#2a2c34 55%,#3d4048 100%)",
        boxShadow: steel
          ? "0 6px 18px -8px rgba(0,0,0,.75), inset 0 0 0 .5px rgba(255,255,255,.35)"
          : "0 4px 14px -8px rgba(0,0,0,.7)",
      }}
    >
      {/* Skyltens insida */}
      <span
        className="relative flex items-center gap-3 overflow-hidden px-5 py-2.5"
        style={{
          borderRadius: 7.5,
          background:
            "linear-gradient(180deg,#23252c 0%,#161820 48%,#0e1015 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,.07), inset 0 -1px 0 rgba(0,0,0,.6)",
        }}
      >
        {/* Emblem — abstrakt märke, inte en logotyp */}
        <span
          className="relative grid h-6 w-6 shrink-0 place-items-center"
          style={{
            borderRadius: 5,
            background: "linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.02))",
            boxShadow: "inset 0 0 0 .5px rgba(255,255,255,.16)",
          }}
        >
          <span className="flex flex-col gap-[2px]">
            <span className="block h-[1px] w-3" style={{ background: "rgba(226,228,233,.85)" }} />
            <span className="block h-[1px] w-2" style={{ background: "rgba(226,228,233,.55)" }} />
            <span className="block h-[1px] w-3" style={{ background: "rgba(226,228,233,.85)" }} />
          </span>
        </span>

        {/* Vertikal delare, som på en skylt */}
        <span
          className="h-5 w-[1px] shrink-0"
          style={{
            background:
              "linear-gradient(180deg,transparent,rgba(255,255,255,.22),transparent)",
          }}
        />

        <span
          className="text-[12.5px] font-semibold uppercase"
          style={{ letterSpacing: "0.16em", color: "#eceef2" }}
        >
          {children}
        </span>

        {/* Glans som sveper vid hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 opacity-0 transition-all duration-700 ease-out group-hover:left-[110%] group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent)",
          }}
        />
      </span>
    </Link>
  );
}
