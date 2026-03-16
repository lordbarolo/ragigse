import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Lock, ArrowRight, BarChart3 } from "lucide-react";
import { fmt, formatPartialValue } from "@/shared/formatters";
import { SectionHeading, StatBlock } from "@/shared/UIComponents";
import type { ResultJson } from "@/shared/types";
import ConsultantRateLookup from "./ConsultantRateLookup";
import ReportFeedback from "./ReportFeedback";

interface Props {
  r: ResultJson;
  isFullAccess: boolean;
  occupation: string;
  kommun: string;
  leadId?: string;
  userZone?: string;
}

export default function PermanentTrackContent({ r, isFullAccess, occupation, kommun, leadId, userZone }: Props) {
  const gap = r.gap_analysis;
  const benchMarket = r.market;
  const p75 = benchMarket?.percentile_75 ?? 0;

  return (
    <>
      {/* Benchmarkdata */}
      <Card className="card-shadow">
        <CardContent className="pt-6 space-y-4">
          <SectionHeading icon={BarChart3} title="Marknadsersättningar" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-micro uppercase tracking-wide mb-1">P25</p>
              <p className="text-base font-bold text-foreground">
                {benchMarket?.percentile_25 ? `${fmt(benchMarket.percentile_25)} kr` : "—"}
              </p>
              <p className="text-micro mt-0.5">/månad</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 ring-2 ring-primary/30">
              <p className="text-micro uppercase tracking-wide text-primary font-medium mb-1">Median</p>
              <p className="text-base font-bold text-foreground">
                {benchMarket?.percentile_50 ? `${fmt(benchMarket.percentile_50)} kr` : "—"}
              </p>
              <p className="text-micro mt-0.5">/månad</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-micro uppercase tracking-wide text-accent font-medium mb-1">P75</p>
              <p className="text-base font-bold text-foreground">
                {p75 ? `${fmt(p75)} kr` : "—"}
              </p>
              <p className="text-micro mt-0.5">/månad</p>
            </div>
          </div>
          <p className="text-caption text-center">
            Källa: {benchMarket?.source ?? "Medlingsinstitutet"} {benchMarket?.year ?? "2024"}
            {benchMarket?.region ? ` · ${benchMarket.region}` : ""}
          </p>
        </CardContent>
      </Card>

      {/* Gap-analys */}
      {gap && (
        <Card className="card-shadow overflow-hidden">
          {isFullAccess ? (
            <>
              <div className={`p-4 flex items-center gap-3 ${gap.gap_vs_p75 > 0 ? "bg-accent/10" : "bg-green-500/10"}`}>
                <TrendingUp className={`w-5 h-5 ${gap.gap_vs_p75 > 0 ? "text-accent" : "text-green-600"}`} />
                <p className="font-semibold text-foreground">
                  {gap.gap_vs_p75 > 0
                    ? `Skillnad mot P75: ${fmt(gap.gap_vs_p75)} kr/mån`
                    : "Din ersättning ligger över P75"}
                </p>
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="Din nuvarande ersättning" value={`${fmt(gap.current_salary)} kr/mån`} muted />
                  <StatBlock label="Marknadens P75" value={`${fmt(p75)} kr/mån`} accent />
                </div>
                {gap.gap_vs_p75 > 0 && (
                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                    <p className="text-hint mb-1">Avstånd till P75</p>
                    <p className="text-2xl font-bold text-accent">+{fmt(gap.gap_vs_p75)} kr/mån</p>
                    {gap.gap_pct !== null && (
                      <p className="text-hint mt-1">
                        ({gap.gap_pct}% under P75 för din yrkesgrupp)
                      </p>
                    )}
                  </div>
                )}
                {/* Feedback */}
                {leadId && (
                  <ReportFeedback leadId={leadId} role={occupation} zone={userZone} />
                )}
                {/* Marknadsdata */}
                <div className="space-y-2 pt-2">
                  <p className="text-caption">Marknadsdata</p>
                  <ul className="space-y-2">
                    {[
                      `Medianersättningen för ${occupation} är ${fmt(benchMarket?.percentile_50 ?? 0)} kr/mån enligt Medlingsinstitutet.`,
                      gap.category === "large"
                        ? "Skillnaden mot medianen är betydande."
                        : gap.category === "medium"
                        ? "Din ersättning ligger under medianen."
                        : "Din ersättning ligger nära marknaden.",
                      "Statistiken baseras på SCB/Medlingsinstitutet och visar lönefördelningen per yrkesgrupp.",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                        <span className="text-body-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <div className="bg-muted/50 p-4 flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <p className="font-semibold text-foreground">Din gap-analys — låst</p>
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="Din nuvarande ersättning" value={`${fmt(gap.current_salary)} kr/mån`} muted />
                  <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                    <p className="text-hint mb-1">Avstånd till P75</p>
                    <p className="text-base font-semibold text-accent blur-sm select-none">
                      {formatPartialValue(gap.gap_vs_p75 > 0 ? gap.gap_vs_p75 : 500)} kr/mån
                    </p>
                  </div>
                </div>
                <p className="text-body-sm text-center">
                  Lås upp för att se fullständig jämförelse med marknadsdata.
                </p>
              </CardContent>
            </>
          )}
        </Card>
      )}

      {/* Konsultlöne-lookup */}
      <ConsultantRateLookup
        occupation={occupation}
        kommun={kommun}
        sector={r.inputs.sector}
      />
    </>
  );
}
