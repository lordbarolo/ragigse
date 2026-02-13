import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  ShieldCheck,
  MapPin,
  Briefcase,
  ArrowRight,
  BarChart3,
  MessageSquareQuote,
  Building2,
  Lock,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ── Types ────────────────────────────────────────────── */

interface ResultJson {
  calc_version: string;
  inputs: {
    location_id?: string;
    occupation: string;
    employment_type: string;
    experience_years: number;
    current_salary_sek: number;
  };
  market: {
    rate_customer_sek_per_hour: number;
  };
  recommendation?: {
    consultant_share_min: number;
    consultant_share_max: number;
    employee_factor: number;
    recommended_hourly_min: number;
    recommended_hourly_max: number;
    recommended_monthly_min: number;
    recommended_monthly_max: number;
    hours_per_month: number;
  };
  delta?: {
    monthly_vs_current_min: number;
    monthly_vs_current_max: number;
  };
}

interface ReportData {
  id: string;
  status: string;
  access: "full" | "preview";
  occupation: string;
  employment_type: string;
  kommun: string;
  experience: number;
  referral_unlock_granted: boolean;
  result_json: ResultJson;
}

/* ── Helpers ──────────────────────────────────────────── */

function fmt(v: number) {
  return v.toLocaleString("sv-SE");
}

function ensureNoTrailingZeros(value: number): number {
  const chars = String(value).split("");
  for (let i = Math.max(0, chars.length - 3); i < chars.length; i++) {
    if (chars[i] === "0") chars[i] = "1";
  }
  return parseInt(chars.join(""), 10);
}

function formatPartialValue(value: number): string {
  const adjusted = ensureNoTrailingZeros(value);
  const chars = String(adjusted).split("");
  if (chars.length > 1) chars[1] = "X";
  const result = chars.join("");
  if (result.length > 3) {
    return result.slice(0, -3) + " " + result.slice(-3);
  }
  return result;
}

/* ── Main component ───────────────────────────────────── */

export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      navigate("/");
      return;
    }

    const fetchReport = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-report", {
          body: { report_id: reportId },
        });
        if (error || !data || data.error) {
          navigate("/");
          return;
        }
        setReport(data as ReportData);
      } catch {
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, navigate]);

  const handleCheckout = async (plan: "single" | "yearly") => {
    if (!report) return;
    setCheckoutLoading(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          email: report.result_json?.inputs?.occupation ? undefined : undefined,
          lead_id: undefined,
          report_id: report.id,
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Kunde inte starta betalning, försök igen", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) return null;

  const r = report.result_json;
  const isFullAccess = report.access === "full" && r.recommendation;
  const isEmployee = report.employment_type === "anstalld";
  const marketRate = r.market.rate_customer_sek_per_hour;

  /* Preview values for teaser */
  const currentSalary = r.inputs.current_salary_sek;
  const currentHourly = isEmployee ? Math.round(currentSalary / 165) : currentSalary;

  /* Full access values */
  const rec = r.recommendation;
  const delta = r.delta;

  const margin = 0.15;
  const afterMargin = Math.round(marketRate * (1 - margin));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient py-10 px-5 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
            {isFullAccess ? "Din personliga rapport" : "Förhandsgranskning"}
          </p>
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Löneanalys för {report.occupation}
          </h1>
          <p className="text-sm text-primary-foreground/80">
            {report.kommun} · {report.experience} års erfarenhet
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
        {/* ── 1. Ramavtalspris ────────────────────── */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-3">
            <SectionHeading icon={BarChart3} title="Ramavtalspris" />
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Timpris mot kund (ramavtal)</p>
              <p className="text-2xl font-bold text-foreground">{fmt(marketRate)} kr/h</p>
              <p className="text-xs text-muted-foreground mt-1">
                Grundtimpris enligt ramavtal (OB/jour ej inkluderat)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Rekommenderad ersättning ─────────── */}
        <Card className="card-shadow overflow-hidden">
          {isFullAccess && rec ? (
            <>
              <div className="bg-accent/10 p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                <p className="font-semibold text-foreground">
                  {delta && delta.monthly_vs_current_min > 0
                    ? `Du kan tjäna upp till ${fmt(delta.monthly_vs_current_max)} kr mer per månad`
                    : "Din lön ligger i linje med marknaden!"}
                </p>
              </div>
              <CardContent className="pt-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="Din timlön" value={`${fmt(currentHourly)} kr`} muted />
                  <StatBlock
                    label={isEmployee ? "Rekommenderad timlön" : "Rekommenderad ersättning"}
                    value={`${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr`}
                    accent
                  />
                  <StatBlock
                    label="Din månadslön"
                    value={`${fmt(currentSalary)} kr`}
                    muted
                  />
                  <StatBlock
                    label="Möjlig månadslön"
                    value={`${fmt(rec.recommended_monthly_min)}–${fmt(rec.recommended_monthly_max)} kr`}
                    accent
                  />
                </div>

                {/* Förhandlingsspann */}
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Förhandlingsspann</p>
                  <p className="text-lg font-bold text-foreground">
                    {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h
                  </p>
                  <p className="text-sm text-muted-foreground">
                    = {fmt(rec.recommended_monthly_min)}–{fmt(rec.recommended_monthly_max)} kr/mån
                    ({rec.hours_per_month}h/mån)
                  </p>
                </div>

                {/* Skillnad mot nuvarande */}
                {delta && delta.monthly_vs_current_min > 0 && (
                  <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                    <p className="text-xs text-muted-foreground mb-1">Skillnad mot din nuvarande lön</p>
                    <p className="text-lg font-bold text-destructive">
                      +{fmt(delta.monthly_vs_current_min)}–{fmt(delta.monthly_vs_current_max)} kr/mån
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            /* TEASER / PREVIEW */
            <>
              <div className="bg-destructive/10 p-4 flex items-center gap-3">
                <Lock className="w-5 h-5 text-destructive" />
                <p className="font-semibold text-foreground">Rekommenderad lön — låst</p>
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="Din timlön" value={`${fmt(currentHourly)} kr`} muted />
                  <div className="p-3 rounded-lg bg-accent/10 relative overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-1">Rekommenderad timlön</p>
                    <p className="text-base font-semibold text-accent blur-sm select-none">
                      {formatPartialValue(Math.round(marketRate * 0.6))} kr
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Lås upp den fullständiga analysen med exakta siffror, förhandlingsspann och personliga rekommendationer.
                </p>
              </CardContent>
            </>
          )}
        </Card>

        {/* ── 3. Antaganden (full access) ─────────── */}
        {isFullAccess && rec && (
          <Card className="card-shadow">
            <CardContent className="pt-6 space-y-4">
              <SectionHeading icon={BarChart3} title="Så räknade vi" />
              <div className="space-y-3 text-sm text-muted-foreground">
                <CalcRow label="Ramavtalspris (timpris mot kund)" value={`${fmt(marketRate)} kr/h`} />
                <CalcRow label="Bemanningsbolagets marginal (15%)" value={`−${fmt(Math.round(marketRate * margin))} kr/h`} />
                <CalcRow label="Löneutrymme efter marginal" value={`${fmt(afterMargin)} kr/h`} />
                {isEmployee ? (
                  <>
                    <CalcRow
                      label="÷ 1.42 (arbetsgivaravg. + semester + pension 4.5%)"
                      value={`= ${fmt(Math.round(afterMargin / 1.42))} kr/h brutto`}
                    />
                    <p className="text-xs text-muted-foreground/70 pt-1">
                      Spannet {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h
                      baseras på 10–15% marginal.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    Som egenföretagare bör du fakturera 85–90% av kundpriset, dvs{" "}
                    {fmt(rec.recommended_hourly_min)}–{fmt(rec.recommended_hourly_max)} kr/h.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 4. Förhandlingsrekommendationer (full) ── */}
        {isFullAccess && rec && (
          <Card className="card-shadow">
            <CardContent className="pt-6 space-y-4">
              <SectionHeading icon={MessageSquareQuote} title="Förhandlingsrekommendationer" />
              <ul className="space-y-3">
                {getNegotiationTips(
                  isEmployee,
                  delta ? delta.monthly_vs_current_min > 0 : false,
                  delta ? Math.round((delta.monthly_vs_current_max / rec.recommended_monthly_max) * 100) : 0,
                  report.occupation
                ).map((tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* ── 5. Nästa steg — vad du ska säga (full) ── */}
        {isFullAccess && rec && (
          <Card className="card-shadow border-primary/20">
            <CardContent className="pt-6 space-y-4">
              <SectionHeading icon={Lightbulb} title="Nästa steg — vad du ska säga" />
              <div className="space-y-4 text-sm text-muted-foreground">
                <ScriptBlock
                  step={1}
                  title="Boka möte"
                  text="Kontakta din bemanningskonsult och begär ett lönesamtal. Nämn att du har gjort en marknadsanalys."
                />
                <ScriptBlock
                  step={2}
                  title="Presentera data"
                  text={`"Jag har tagit fram ramavtalspriset för ${report.occupation} i min region. Kundpriset ligger på ${fmt(marketRate)} kr/h, och med 15% marginal borde min ${isEmployee ? 'bruttolön' : 'fakturering'} landa på ${fmt(rec.recommended_hourly_min)}–${fmt(rec.recommended_hourly_max)} kr/h."`}
                />
                <ScriptBlock
                  step={3}
                  title="Ställ frågan"
                  text={`"Jag vill att min ersättning justeras till minst ${fmt(rec.recommended_hourly_min)} kr/h. Kan vi hitta en lösning?"`}
                />
                {isEmployee && (
                  <ScriptBlock
                    step={4}
                    title="Bonus: fråga om pension"
                    text={`"Ingår tjänstepension på minst 4.5% i min anställning? Det är standard i ramavtalet."`}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 6. Godkända leverantörer (full) ─────── */}
        {isFullAccess && (
          <Card className="card-shadow">
            <CardContent className="pt-6 space-y-4">
              <SectionHeading icon={Building2} title="Godkända leverantörer (ramavtal)" />
              <p className="text-sm text-muted-foreground">
                Bemanningsföretag med ramavtal för {report.occupation}:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {APPROVED_SUPPLIERS.map((s) => (
                  <div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
                    <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-foreground">{s}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── CTA: Köpknappar (preview only) ─────── */}
        {!isFullAccess && (
          <div className="space-y-4">
            <Card className="card-shadow">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-display text-lg text-foreground">I din rapport får du:</h3>
                <ul className="space-y-2 text-sm">
                  {[
                    "Exakt beräknad bruttolön baserat på ramavtal",
                    "Konkret förhandlingsspann med siffror",
                    "Steg-för-steg script: vad du ska säga",
                    "Lista på godkända leverantörer",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => handleCheckout("single")}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all disabled:opacity-70"
              >
                {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
                {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
              </button>
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => handleCheckout("yearly")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
              >
                {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Engångsbetalning · Ingen bindningstid · Stripe säker betalning
              </p>
            </div>
          </div>
        )}

        {/* ── Disclaimer ─────────────────────────── */}
        <Separator />
        <p className="text-xs text-muted-foreground text-center leading-relaxed pb-8">
          Denna rapport baseras på offentliga ramavtalspriser och är avsedd som vägledning.
          Faktisk lön kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
          <br />
          © {new Date().getFullYear()} BraGig.se
        </p>
      </main>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="font-display text-lg text-foreground">{title}</h2>
    </div>
  );
}

function StatBlock({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${accent ? "bg-accent/10" : "bg-muted/50"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium text-foreground whitespace-nowrap">{value}</span>
    </div>
  );
}

function ScriptBlock({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="mt-1 text-muted-foreground italic">{text}</p>
      </div>
    </div>
  );
}

/* ── Static data ──────────────────────────────────────── */

const APPROVED_SUPPLIERS = [
  "Dedicare",
  "Bemanning Sverige",
  "Medpeople",
  "Randstad Care",
  "Adecco Medical",
  "Manpower Care",
  "Uniflex",
  "Qualipharma",
];

function getNegotiationTips(
  isEmployee: boolean,
  isUnderpaid: boolean,
  diffPercent: number,
  yrke: string
): string[] {
  const tips: string[] = [];

  if (isUnderpaid) {
    tips.push(
      `Enligt ramavtalet bör din ersättning ligga ${diffPercent}% högre. Använd detta som utgångspunkt i förhandlingen.`
    );
    tips.push(
      "Begär ett möte med din bemanningskonsult och presentera ramavtalspriserna som referens."
    );
  } else {
    tips.push(
      "Din lön ligger redan nära marknadspris — bra förhandlat! Fokusera på andra förmåner."
    );
  }

  if (isEmployee) {
    tips.push(
      "Fråga om tjänstepensionen uppgår till minst 4.5% — det ingår i ramavtalets kalkyl."
    );
    tips.push(
      "Kontrollera att OB-tilläggen följer gällande kollektivavtal."
    );
    tips.push(
      "Förhandla om utbildningsbudget och kompetensutveckling."
    );
  } else {
    tips.push(
      "Som egenföretagare bör du fakturera minst 85% av kundpriset."
    );
    tips.push(
      "Förhandla betalningsvillkor — 15 dagars betaltid istället för 30 gör stor skillnad."
    );
  }

  tips.push(
    `Nämn att du är medveten om ramavtalspriserna för ${yrke} i din zon — det signalerar att du är insatt.`
  );

  return tips;
}
