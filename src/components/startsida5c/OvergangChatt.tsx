import { Link } from "@/lib/router-compat";
import HomeAssistantChat from "@/components/assistant/HomeAssistantChat";

export default function OvergangChatt() {
  return (
    <section
      id="assistent"
      className="scroll-mt-16 bg-background"
    >
      <div className="relative mx-auto max-w-[1160px] px-5 pb-32 pt-10 text-center md:px-10 md:pb-40 md:pt-14">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 -z-0 h-[420px] w-[680px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse,rgba(91,91,240,.13),transparent 65%)",
            filter: "blur(30px)",
          }}
        />
        <div className="relative">
          <h2
            className="m-0 text-[28px] font-semibold sm:text-[36px] lg:text-[44px]"
            style={{
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Vad tänker du på?.
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#ffffff,#8a8c94)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Sätt din assistent i arbete.
            </span>
          </h2>
          <p
            className="mx-auto mt-4 max-w-[600px] text-[15.5px]"
            style={{ lineHeight: 1.6, color: "#a1a3ab" }}
          >
            Vad tänker du på?
          </p>

          <div className="mx-auto mt-9 w-full text-left">
            <HomeAssistantChat />
          </div>

          <div className="mt-2.5 text-[11.5px]" style={{ color: "#8a8c94" }}>
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
