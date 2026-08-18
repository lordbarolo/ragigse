import { Link } from "@/lib/router-compat";
import { trackEvent } from "@/lib/trackEvent";

export default function FilmFakturakontroll() {
  return (
    <section
      id="fakturakontroll"
      className="scroll-mt-16"
      style={{ background: "#0b0c10" }}
    >
      <div className="mx-auto max-w-[1160px] px-5 pb-24 pt-10 text-center md:px-10 md:pb-32 md:pt-14">
        <h2
          className="m-0 text-[28px] font-semibold sm:text-[36px] lg:text-[44px]"
          style={{ lineHeight: 1.08, letterSpacing: "-0.02em", color: "#ffffff" }}
        >
          Saknas det timmar på dina fakturor?
          <br />
          <span
            style={{
              background: "linear-gradient(90deg,#ffffff,#b8bac2)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Se hur granskningen fungerar.
          </span>
        </h2>

        <Link
          to="/consultant/fakturahjalp"
          onClick={() => trackEvent("cta_clicked", { cta: "film_fakturakontroll", surface: "startsida" })}
          className="mt-9 block overflow-hidden transition-opacity hover:opacity-90"
          style={{ borderRadius: 16, border: "1px solid #22232b" }}
        >
          <video
            src="/fakturakontroll-animation.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Film som visar hur fakturakontrollen hittar missade timmar"
            className="block h-auto w-full"
          />
        </Link>

        <div className="mt-4 text-[13px]" style={{ color: "#a1a3ab" }}>
          Ingen kostnad om vi inte hittar något.
        </div>
      </div>
    </section>
  );
}
