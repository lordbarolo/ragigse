import { Link } from "@/lib/router-compat";
import HomeAssistantChat from "@/components/assistant/HomeAssistantChat";
import { marginText5c } from "./rate5c";

export default function OvergangChatt() {
  const doctorMargin = marginText5c("Specialistläkare psykiatri");
  const otherMargin = marginText5c("Sjuksköterska");

  return (
    <section
      id="assistent"
      className="scroll-mt-16"
      style={{
        background:
          "linear-gradient(180deg,#0e1016 0%,#141726 30%,#1f2338 50%,#3b4058 66%,#7b8095 80%,#c3c6d0 91%,#f5f5f7 100%)",
      }}
    >
      <div className="relative mx-auto max-w-[820px] px-5 pb-32 pt-10 text-center md:px-12 md:pb-40 md:pt-14">

        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 -z-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full"
          style={{
            background: "radial-gradient(ellipse,rgba(91,91,240,.26),transparent 65%)",
            filter: "blur(30px)",
          }}
        />
        <div className="relative">
          <h2
            className="m-0 text-[28px] font-semibold sm:text-[36px] lg:text-[44px]"
            style={{ lineHeight: 1.08, letterSpacing: "-0.02em", color: "#eef0f4" }}
          >
            Ai för konsulter inom sjukvård.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#9da0f5,#6ee7b7)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Sätt din agent i arbete.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[600px] text-[15.5px]" style={{ lineHeight: 1.6, color: "#a3a7b7" }}>
            Fråga assistenten vad regionen betalar för din roll och zon, vad du kan fakturera efter
            bemanningsbolagets marginal och hur avropen har sett ut historiskt. Svaren bygger på omfattande
            Ai-analys av offentliga handlingar och historisk data.
          </p>

          <div className="mx-auto mt-9 max-w-[720px] text-left">
            <HomeAssistantChat />
          </div>

          <div className="mt-2.5 text-[11.5px]" style={{ color: "#aeb3c2" }}>
            Data lagras inom EU · Vi delar aldrig dina uppgifter. Se{" "}
            <Link to="/integritetspolicy" className="underline">
              integritetspolicyn
            </Link>
            .
          </div>
        </div>
      </div>
    </section>
  );
}
