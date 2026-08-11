import Rateraknare from "./Rateraknare";
import { marginText5c } from "./rate5c";

const CHECKS = ["Få notis vid prisökning", "Skapa CV med Ai", "Hitta ofakturerade timmar"];

export default function Hero() {
  const doctorMargin = marginText5c("Specialistläkare anestesi och intensivvård");
  const otherMargin = marginText5c("Sjuksköterska");

  return (
    <section style={{ background: "#0b0c10", borderBottom: "1px solid #22232b" }}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:px-12 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
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
          <div
            className="mb-4 text-[11px] uppercase tracking-[0.14em]"
            style={{ color: "#8a8c94", fontFamily: "'IBM Plex Mono',monospace", animation: "fadeUp5c .55s ease both" }}
          >
            OPTIMERA TID, VILLKOR OCH AVTAL
          </div>
          <h1
            className="m-0 text-[34px] font-semibold sm:text-[42px] lg:text-[50px]"
            style={{
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              animation: "fadeUp5c .55s .08s ease both",
            }}
          >
            Se uppdaterade lönenivåer inom bemanning
          </h1>
          <p
            className="mt-4 max-w-[520px] text-[15.5px]"
            style={{ lineHeight: 1.62, color: "#9b9da7", animation: "fadeUp5c .55s .16s ease both" }}
          >
            Transparent löneinformation baserad på regionernas ramavtal och branschens vanliga marginaler.
          </p>
          <ul
            className="mt-6 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[12.5px]"
            style={{ color: "#8a8c94", animation: "fadeUp5c .55s .2s ease both" }}
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
