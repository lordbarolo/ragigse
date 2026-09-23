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
          <h1
            className="m-0 text-[34px] font-semibold sm:text-[42px] lg:text-[50px]"
            style={{
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              animation: "fadeUp5c .55s .08s ease both",
            }}
          >
            Har du rätt lön?{"\n"}
          </h1>
          <p
            className="mt-4 max-w-[540px] text-[17px]"
            style={{ lineHeight: 1.6, color: "#b8bac2", animation: "fadeUp5c .55s .16s ease both" }}
          >
            Se uppdaterade ersättningar för läkare och sjuksköterskor inom bemanning. Sök utifrån din roll och uppdragets ort.
          </p>
        </div>

        <Rateraknare />
      </div>

      {/* Sidan är mörk hela vägen ner — ingen övergång till ljus sektion behövs. */}
    </section>
  );
}
