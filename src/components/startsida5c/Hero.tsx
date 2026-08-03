import Rateraknare from "./Rateraknare";
import { marginText5c } from "./rate5c";

const CHECKS = ["Inga uppgifter krävs", "Data inom EU", "Uppdateras vid nya avrop"];

export default function Hero() {
  const doctorMargin = marginText5c("Specialistläkare anestesi och intensivvård");
  const otherMargin = marginText5c("Sjuksköterska");

  return (
    <section style={{ background: "#0e1016", borderBottom: "1px solid #22242e" }}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:px-12 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <div
            className="mb-4 text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "#7c7ff2", fontFamily: "'IBM Plex Mono',monospace", animation: "fadeUp5c .55s ease both" }}
          >
            SKR ramavtal 2026 · Offentliga priser
          </div>
          <h1
            className="m-0 text-[34px] font-semibold sm:text-[42px] lg:text-[50px]"
            style={{
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: "#eef0f4",
              animation: "fadeUp5c .55s .08s ease both",
            }}
          >
            AI för dig som jobbar som konsult inom vården
          </h1>
          <p
            className="mt-4 max-w-[520px] text-[15.5px]"
            style={{ lineHeight: 1.62, color: "#a3a7b7", animation: "fadeUp5c .55s .16s ease both" }}
          >
            Kundpris minus typisk marginal — specialistläkare {doctorMargin}, övriga roller {otherMargin}. Samma
            siffror som regionen ser, per roll och zon.
          </p>
          <ul
            className="mt-6 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[12.5px]"
            style={{ color: "#8c90a0", animation: "fadeUp5c .55s .2s ease both" }}
          >
            {CHECKS.map((c) => (
              <li key={c} className="flex items-center gap-2">
                <span style={{ color: "#4ade80" }}>✓</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        <Rateraknare />
      </div>
    </section>
  );
}
