import { useState, useMemo, useEffect } from "react";
import AnthropicScope from "@/components/demo/AnthropicScope";

/**
 * /demo/shiftnex
 * Faithful visual clone of shiftnex.ai's landing — for internal comparison only.
 * NOT linked from production CompCare nav. Light theme is scoped locally so it
 * doesn't fight the global Deep Space tokens.
 */

type Tag = {
  label: string;
  // Tailwind classes for colored pill (light bg + colored text + soft border)
  cls: string;
  // Absolute positioning (percent based for responsiveness)
  top: string;
  left?: string;
  right?: string;
};

const TAGS: Tag[] = [
  { label: "Sjuksköterska", cls: "bg-blue-50 text-blue-600 border-blue-200", top: "8%", left: "8%" },
  { label: "Specialistläkare", cls: "bg-emerald-50 text-emerald-600 border-emerald-200", top: "12%", right: "6%" },
  { label: "Anestesisjuksköterska", cls: "bg-violet-50 text-violet-600 border-violet-200", top: "32%", left: "4%" },
  { label: "Barnmorska", cls: "bg-pink-50 text-pink-600 border-pink-200", top: "78%", left: "12%" },
  { label: "Operationssjuksköterska", cls: "bg-amber-50 text-amber-700 border-amber-200", top: "22%", right: "12%" },
  { label: "Distriktsläkare", cls: "bg-teal-50 text-teal-600 border-teal-200", top: "62%", right: "4%" },
  { label: "vårdgivare", cls: "bg-sky-50 text-sky-700 border-sky-200", top: "26%", left: "32%" },
  { label: "bemanningsföretag", cls: "bg-purple-50 text-purple-600 border-purple-200", top: "82%", left: "38%" },
  { label: "Geriatrik", cls: "bg-rose-50 text-rose-500 border-rose-200", top: "92%", right: "22%" },
  { label: "Akutmottagning", cls: "bg-red-50 text-red-500 border-red-200", top: "76%", right: "8%" },
  { label: "Primärvård", cls: "bg-indigo-50 text-indigo-600 border-indigo-200", top: "44%", right: "32%" },
  { label: "Hemsjukvård", cls: "bg-orange-50 text-orange-600 border-orange-200", top: "18%", left: "44%" },
  { label: "IVA", cls: "bg-cyan-50 text-cyan-700 border-cyan-200", top: "52%", left: "8%" },
];

// Deterministic dot pattern (background)
function useDots(count = 60) {
  return useMemo(() => {
    const out: { top: string; left: string }[] = [];
    let seed = 1;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < count; i++) {
      out.push({ top: `${(rand() * 100).toFixed(2)}%`, left: `${(rand() * 100).toFixed(2)}%` });
    }
    return out;
  }, [count]);
}

export default function ShiftnexClone() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const dots = useDots();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  useEffect(() => {
    document.title = "CompCare Network – Demo (shiftnex-stil)";
  }, []);

  return (
    <AnthropicScope>

      {/* Local light-theme scope. Inline style overrides global dark tokens just for this page. */}
      <main
        className="relative min-h-screen w-full overflow-hidden font-sans"
        style={{
          color: "#0f172a",
        }}
      >
        {/* Dot grid background */}
        <div className="pointer-events-none absolute inset-0">
          {dots.map((d, i) => (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-slate-300/60"
              style={{ top: d.top, left: d.left }}
            />
          ))}
          {/* Faint connecting strokes */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.18]" preserveAspectRatio="none">
            <defs>
              <linearGradient id="ln" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            <path d="M5,15 Q40,40 55,55 T95,80" stroke="url(#ln)" strokeWidth="0.5" fill="none" />
            <path d="M10,80 Q35,55 55,55 T90,20" stroke="url(#ln)" strokeWidth="0.5" fill="none" />
          </svg>
        </div>

        {/* Logo top-left */}
        <header className="relative z-10 flex items-center gap-2 px-6 pt-6 sm:px-10">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-500" />
            <div className="leading-tight">
              <div className="text-base font-semibold tracking-tight text-slate-900">CompCare</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Network</div>
            </div>
          </div>
        </header>

        {/* Floating role tags */}
        <div className="pointer-events-none absolute inset-0 z-0 hidden md:block">
          {TAGS.map((t, i) => (
            <span
              key={i}
              className={`absolute rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur-sm ${t.cls}`}
              style={{
                top: t.top,
                left: t.left,
                right: t.right,
                animation: `cc-float ${6 + (i % 5)}s ease-in-out ${i * 0.3}s infinite alternate`,
              }}
            >
              {t.label}
            </span>
          ))}
        </div>

        {/* Centered card */}
        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-md items-center justify-center px-6">
          <div
            className="w-full rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.15)] backdrop-blur-xl"
          >
            <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
              Care Delivery Network
            </h1>
            <p className="mt-2 text-center text-sm text-slate-500">
              Registrera dig eller koppla din vårdorganisation
            </p>

            {!submitted ? (
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="block text-xs font-medium text-slate-700">
                    E-postadress <span className="text-rose-500">*</span>
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="t.ex. namn@compcare.se"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </label>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Anslut
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                Tack! Vi hör av oss till <span className="font-medium">{email}</span>.
              </div>
            )}

            <hr className="my-6 border-slate-200" />

            <p className="text-center text-xs leading-relaxed text-slate-500">
              Genom att använda CompCare godkänner du{" "}
              <a href="/villkor" className="text-indigo-600 hover:underline">
                Användarvillkoren
              </a>{" "}
              och{" "}
              <a href="/integritetspolicy" className="text-indigo-600 hover:underline">
                Integritetspolicyn
              </a>
              .
            </p>
            <p className="mt-2 text-center text-[11px] text-slate-400">Demo · jämförelse mot shiftnex.ai</p>
          </div>
        </section>

        <style>{`
          @keyframes cc-float {
            0%   { transform: translateY(0px) translateX(0px); }
            100% { transform: translateY(-10px) translateX(6px); }
          }
        `}</style>
      </main>
    </>
  );
}
