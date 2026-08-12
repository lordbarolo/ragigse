import { Link } from "@/lib/router-compat";
import { roleLabel5c } from "@/components/startsida5c/roleLabels5c";
import type { ProfileContext } from "@/lib/profileContext";
import { Calculator, FileSearch, PiggyBank, ScrollText } from "lucide-react";

const TOOLS = [
  {
    to: "/consultant/loneanalys",
    icon: Calculator,
    title: "Löneanalys",
    desc: "Se vad regionen betalar för din roll och vad du kan begära.",
  },
  {
    to: "/consultant/forhandla",
    icon: PiggyBank,
    title: "Pensionssimulator",
    desc: "Räkna på hur ersättningsnivån påverkar din pension över tid.",
  },
  {
    to: "/consultant/avtal",
    icon: ScrollText,
    title: "Avtalsassistent",
    desc: "Få svar på vad ramavtalet säger om pris, krav, OB och vite.",
  },
  {
    to: "/consultant/forhandla",
    icon: FileSearch,
    title: "Fakturahjälpen",
    desc: "Låt agenten granska dina tidrapporter mot fakturerad ersättning.",
  },
];

/** Sektion 2: de fyra verktygen i det inloggade läget. */
export default function ProfileToolsGrid({ context }: { context?: ProfileContext | null }) {
  const basis = context
    ? [
        context.role ? roleLabel5c(context.role) : null,
        context.kommun,
        context.hourlyRate ? `${context.hourlyRate.toLocaleString("sv-SE")} kr/timme` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;
  return (
    <section className="border-t border-white/10 py-14 sm:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Verktyg</p>
        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Fyra verktyg som arbetar med din data
        </h2>
        {basis && (
          <p className="mt-3 text-sm text-white/45">Utgår från dina uppgifter: {basis}</p>
        )}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map((t) => (
            <Link
              key={t.title}
              to={t.to}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-colors hover:border-white/25 hover:bg-white/[0.05]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
                <t.icon className="h-4 w-4 text-white" />
              </span>
              <h3 className="mt-4 text-base font-medium text-white">{t.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">{t.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
