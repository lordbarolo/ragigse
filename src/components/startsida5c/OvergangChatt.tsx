import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { marginText5c } from "./rate5c";

const PRESETS = [
  "Vad betalar regionen för min roll?",
  "Vad kan jag fakturera efter bolagets marginal?",
  "Hur skiljer sig priset mellan zonerna?",
  "Vilka avrop har publicerats senaste 30 dagarna?",
  "Vad ingår i SKR:s ramavtal — och vad ingår inte?",
  "Hur påverkar anställningsform min ersättning?",
  "Vilka uppgifter behöver ni om mig?",
];

export default function OvergangChatt() {
  const navigate = useNavigate();
  const doctorMargin = marginText5c("Specialistläkare psykiatri");
  const otherMargin = marginText5c("Sjuksköterska");

  const ask = (q: string) => navigate(`/consultant/forhandla?q=${encodeURIComponent(q)}`);

  return (
    <section
      style={{
        background: "linear-gradient(180deg,#0e1016 0%,#141726 45%,#1b1f33 100%)",
        borderBottom: "1px solid #22242e",
      }}
    >
      <div className="relative mx-auto max-w-[820px] px-5 pb-16 pt-16 text-center md:px-12 md:pt-20">
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
            bemanningsbolagets marginal och hur avropen har sett ut historiskt. Svaren bygger på SKR:s ramavtal —
            inget annat.
          </p>

          <div
            className="mx-auto mt-9 max-w-[720px] p-5 text-left md:p-6"
            style={{
              background: "rgba(21,24,35,.92)",
              border: "1px solid rgba(122,127,242,.35)",
              borderRadius: 18,
              boxShadow: "0 30px 80px rgba(0,0,0,.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className="grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold"
                style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", color: "#fff" }}
              >
                C
              </span>
              <span className="text-[13px] font-semibold" style={{ color: "#eef0f4" }}>
                CompCare-assistenten
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11px]" style={{ color: "#6ee7b7" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#6ee7b7" }} />
                online
              </span>
            </div>

            <div
              className="mb-4 px-4 py-3 text-[14px]"
              style={{
                background: "rgba(255,255,255,.06)",
                borderRadius: "4px 14px 14px 14px",
                lineHeight: 1.55,
                color: "#d6d8e4",
              }}
            >
              Hej! Jag är din CompCare-assistent. Välj en fråga så svarar jag utifrån SKR:s ramavtal och
              publicerade avrop.
            </div>

            <div className="mb-4 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => ask(p)}
                  className="rounded-[9px] px-3.5 py-2.5 text-left text-[12.5px] transition-colors hover:border-[rgba(139,139,246,.5)]"
                  style={{
                    border: "1px solid rgba(255,255,255,.12)",
                    background: "rgba(255,255,255,.02)",
                    color: "#c2c5d4",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = (new FormData(e.currentTarget).get("q") as string) || "";
                if (q.trim()) ask(q.trim());
              }}
              className="flex items-center gap-2 rounded-xl py-2 pl-4 pr-2"
              style={{ background: "#0d0f15", border: "1px solid rgba(255,255,255,.14)" }}
            >
              <input
                name="q"
                placeholder="Ställ din egen fråga..."
                className="h-9 flex-1 bg-transparent text-[14px] outline-none"
                style={{ color: "#eef0f4" }}
              />
              <span aria-hidden className="inline-block h-[15px] w-[1.5px] caret5c" style={{ background: "#8b8bf6" }} />
              <button
                type="submit"
                aria-label="Skicka fråga till assistenten"
                className="grid h-[38px] w-[38px] place-items-center rounded-[10px] text-[16px]"
                style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)", color: "#fff" }}
              >
                ↑
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12.5px]" style={{ color: "#8c90a0" }}>
            <span className="flex items-center gap-1.5">
              <span style={{ color: "#6ee7b7" }}>✓</span>Baserat på SKR:s offentliga ramavtalspriser
            </span>
            <span className="flex items-center gap-1.5">
              <span style={{ color: "#6ee7b7" }}>✓</span>Branschens standardmarginaler — specialistläkare{" "}
              {doctorMargin}, övriga {otherMargin}
            </span>
          </div>
          <div className="mt-2.5 text-[11.5px]" style={{ color: "#565b6e" }}>
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
