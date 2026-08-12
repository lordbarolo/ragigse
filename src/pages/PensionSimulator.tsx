import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PiggyBank } from "lucide-react";
import { Link } from "@/lib/router-compat";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import { calculateAllScenarios } from "@/lib/pensionSimulation";
import { HOURS_PER_MONTH } from "@/lib/calc";
import { trackEvent } from "@/lib/trackEvent";

const MIN_SALARY = 20000;
const MAX_SALARY = 250000;
const STEP = 500;

const fmt = (n: number) => Math.round(n).toLocaleString("sv-SE");

/**
 * /consultant/pension
 * Dedikerad vy för Pensionssimulatorn — hur ersättningsnivån påverkar
 * tjänstepensionen enligt kollektivavtalade nivåer.
 */
export default function PensionSimulator() {
  const { user } = useAuth();
  const { context } = useProfileContext(user?.id);
  const [salary, setSalary] = useState<number | null>(null);

  useEffect(() => {
    trackEvent("pension_page_viewed");
  }, []);

  // Förifyll utifrån profilens timersättning första gången den finns.
  useEffect(() => {
    if (salary !== null) return;
    const fromProfile = context?.hourlyRate ? context.hourlyRate * HOURS_PER_MONTH : 55000;
    const clamped = Math.min(
      MAX_SALARY,
      Math.max(MIN_SALARY, Math.round(fromProfile / STEP) * STEP),
    );
    setSalary(clamped);
  }, [context, salary]);

  const value = salary ?? 55000;
  const scenarios = useMemo(() => calculateAllScenarios(value), [value]);

  const rows = [
    {
      label: "Utan tjänstepension",
      amount: scenarios.none.pensionContribution,
      note: "0 % av bruttolönen",
    },
    {
      label: "4,5 % tjänstepension",
      amount: scenarios.standard.pensionContribution,
      note: "Grundnivån enligt kollektivavtal",
    },
    {
      label: "Kollektivavtalad trappa",
      amount: scenarios.tiered.pensionContribution,
      note: "4,5 % upp till 52 125 kr/mån, 30 % på lönedelen över",
    },
  ];

  const diff =
    scenarios.tiered.pensionContribution - scenarios.none.pensionContribution;

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:py-12">
        <Link
          to="/consultant/profil"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till profilen
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              Pensionssimulator
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Vad gör ersättningen med din pension?
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
              Enligt det nationella avtalet för vårdbemanning ska bemanningsföretag
              betala tjänstepension enligt kollektivavtal. Dra i reglaget för att se
              hur olika lönenivåer påverkar den månatliga pensionsavsättningen.
            </p>
            {context?.hourlyRate && (
              <p className="mt-4 text-xs text-white/40">
                Utgångspunkt: {fmt(context.hourlyRate)} kr/timme ×{" "}
                {HOURS_PER_MONTH} timmar.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
                <PiggyBank className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Månadslön före skatt</p>
                <p className="text-xs text-white/45">{fmt(value)} kr/månad</p>
              </div>
            </div>

            <div className="mt-6">
              <Slider
                value={[value]}
                min={MIN_SALARY}
                max={MAX_SALARY}
                step={STEP}
                onValueChange={(v) => setSalary(v[0])}
                aria-label="Månadslön"
              />
              <div className="mt-2 flex justify-between text-[11px] text-white/35">
                <span>{fmt(MIN_SALARY)} kr</span>
                <span>{fmt(MAX_SALARY)} kr</span>
              </div>
            </div>

            <div className="mt-7 space-y-3">
              {rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{r.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/40">{r.note}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-white">
                    {fmt(r.amount)} kr/mån
                  </p>
                </div>
              ))}
            </div>

            {diff > 0 && (
              <p className="mt-5 text-sm leading-relaxed text-white/55">
                Skillnaden mellan ingen tjänstepension och den kollektivavtalade
                trappan är{" "}
                <span className="font-semibold text-white">{fmt(diff)} kr/månad</span> —
                motsvarande {fmt(diff * 12)} kr per år.
              </p>
            )}

            <p className="mt-5 text-xs leading-relaxed text-white/35">
              Beräkningen är en förenklad uppskattning utifrån kollektivavtalade
              avsättningsnivåer och gällande arbetsgivaravgifter. Den utgör inte
              rådgivning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
