import Rateraknare from "./Rateraknare";
import { marginText5c } from "./rate5c";

const CHECKS = ["Få notis vid prisökning", "Skapa CV med Ai"];

export default function Hero() {
  const doctorMargin = marginText5c("Specialistläkare anestesi och intensivvård");
  const otherMargin = marginText5c("Sjuksköterska");

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#0b0c10", borderBottom: "1px solid #22232b" }}
    >
      {/* Spotlight: ljuskägla från övre högra hörnet ned mot mitten */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 88% -10%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.07) 28%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0) 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[35%] right-[-10%] hidden h-[150%] w-[70%] md:block"
        style={{
          background:
            "conic-gradient(from 190deg at 90% 0%, rgba(255,255,255,0.10) 0deg, rgba(255,255,255,0) 55deg)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:px-12 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">

        <div>
          <a
            href="/registrera"
            className="mb-6 inline-flex rounded-full p-[1px] no-underline"
            style={{
              background: "linear-gradient(100deg,#4ade80,#22d3ee 35%,#6366f1 70%,#4ade80)",
              animation: "fadeUp5c .55s ease both",
            }}
          >
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-medium"
              style={{ background: "#0b0c10", color: "#e8eaef" }}
            >
              Sätt din AI-assistent i arbete
              <span style={{ color: "#8a8c94" }}>›</span>
            </span>
          </a>
          <h1
            className="m-0 text-[34px] font-semibold sm:text-[42px] lg:text-[50px]"
            style={{
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              animation: "fadeUp5c .55s .08s ease both",
            }}
          >
            Se uppdaterade löner för läkare och sjuksköterskor
          </h1>
          <p
            className="mt-4 max-w-[540px] text-[17px]"
            style={{ lineHeight: 1.6, color: "#b8bac2", animation: "fadeUp5c .55s .16s ease both" }}
          >
            Transparent löneinformation baserad på regionernas ramavtal och branschens vanliga marginaler.
          </p>
          <ul
            className="mt-6 hidden list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[14px] sm:flex"
            style={{ color: "#a1a3ab", animation: "fadeUp5c .55s .2s ease both" }}
          >
            {CHECKS.map((c) => (
              <li key={c} className="flex flex-col gap-1">
                <span style={{ color: "#4ade80" }}>✓</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <Rateraknare />
      </div>
    </section>
  );
}
