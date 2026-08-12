import { Link } from "@/lib/router-compat";
import HomeAssistantChat from "@/components/assistant/HomeAssistantChat";

export default function OvergangChatt() {
  return (
    <section
      id="assistent"
      className="form-light scroll-mt-16"
      style={{ background: "#f5f5f7" }}
    >
      <div className="relative mx-auto max-w-[1160px] px-5 pb-32 pt-10 text-center md:px-10 md:pb-40 md:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 -z-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse,rgba(81,85,240,.06),transparent 65%)",
            filter: "blur(30px)",
          }}
        />
        <div className="relative">
          <h2
            className="m-0 text-[28px] font-semibold sm:text-[36px] lg:text-[44px]"
            style={{
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "#1a1b22",
            }}
          >
            Sätt din assistent i arbete.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#1a1b22,#6b6b6b)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Vad tänker du på?
            </span>
          </h2>

          <div className="mx-auto mt-9 w-full text-left">
            <HomeAssistantChat />
          </div>

          <div className="mt-3 text-[13px]" style={{ color: "#6b6b6b" }}>
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
