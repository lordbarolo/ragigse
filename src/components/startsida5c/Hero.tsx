import Rateraknare from "./Rateraknare";
import { marginText5c } from "./rate5c";



export default function Hero() {
  const doctorMargin = marginText5c("Specialistläkare anestesi och intensivvård");
  const otherMargin = marginText5c("Sjuksköterska");

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "#0b0c10" }}
    >
      {/* Spotlight: ljuskägla från övre högra hörnet ned mot mitten */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 88% -10%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 28%, rgba(255,255,255,0.01) 52%, rgba(255,255,255,0) 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[35%] right-[-10%] hidden h-[150%] w-[70%] md:block"
        style={{
          background:
            "conic-gradient(from 190deg at 90% 0%, rgba(255,255,255,0.06) 0deg, rgba(255,255,255,0) 55deg)",
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
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-[7px] text-[13px] font-medium"
              style={{ background: "#0b0c10", color: "#e8eaef" }}
            >
              Logga in för att träffa din AI-assistent
              <span className="leading-none" style={{ color: "#8a8c94" }}>›</span>
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
            Har du rätt lön?<br />Se svaret direkt
          </h1>
          <p
            className="mt-4 max-w-[540px] text-[17px]"
            style={{ lineHeight: 1.6, color: "#b8bac2", animation: "fadeUp5c .55s .16s ease both" }}
          >
            Transparent löneinformation baserad på regionernas avtal och branschens vanliga marginaler. Kostnadsfritt och öppet för alla.
          </p>
        </div>

        <Rateraknare />
      </div>

      {/*
        Mjuk övergång från mörk hero till ljus sektion.
        Längre höjd + många stopp med ease-in-out-kurva gör att ingen grå
        "dimbandskant" uppstår. Skuggorna behåller en svag blå ton (samma
        familj som heron) istället för neutralgrått, och ett diskret ljus
        i mitten bryter av den platta horisontella banden.
      */}
      <div aria-hidden className="relative h-32 w-full md:h-48">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg," +
              "#0b0c10 0%," +
              "#0b0c10 12%," +
              "#0c0d12 22%," +
              "#0e1016 30%," +
              "#11131a 38%," +
              "#161923 46%," +
              "#1d212d 53%," +
              "#262b39 59%," +
              "#333848 65%," +
              "#434958 71%," +
              "#575c6b 77%," +
              "#737782 82%," +
              "#9296a2 87%," +
              "#b3b6bd 91%," +
              "#d1d3d8 94.5%," +
              "#e6e7ea 97%," +
              "#f2f2f5 99%," +
              "#f5f5f7 100%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 100%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, rgba(255,255,255,0) 70%)",
          }}
        />
      </div>
    </section>
  );
}
