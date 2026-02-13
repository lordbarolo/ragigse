import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates, calculateResult } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, TrendingDown, ArrowRight, ShieldCheck } from "lucide-react";

export default function Teaser() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const { data: rates } = useRates();
  const [survey, setSurvey] = useState<SurveyData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (!raw) {
      navigate("/");
      return;
    }
    setSurvey(JSON.parse(raw));
  }, [navigate]);

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === survey?.kommun),
    [locations, survey]
  );

  const selectedRate = useMemo(() => {
    if (!rates || !selectedLocation || !survey) return null;
    const zoneRates = rates.filter((r) => r.zon === selectedLocation.zon);
    const exact = zoneRates.find((r) => r.yrkeskategori === survey.yrke);
    if (exact) return exact;
    const selectedRateFull = rates.find((r) => r.yrkeskategori === survey.yrke);
    if (!selectedRateFull) return null;
    return zoneRates.find((r) => r.typ === selectedRateFull.typ) || null;
  }, [rates, selectedLocation, survey]);

  const result = useMemo(() => {
    if (!selectedRate || !survey) return null;
    return calculateResult(selectedRate.timpris_kund, survey.employmentType);
  }, [selectedRate, survey]);

  // Convert monthly to hourly for comparison
  const userHourly = useMemo(() => {
    if (!survey) return 0;
    if (survey.salaryType === "hourly") return survey.currentSalary;
    return Math.round(survey.currentSalary / 165); // ~165 hours/month
  }, [survey]);

  const isUnderpaid = result ? userHourly < result.high : false;
  const diffPercent = result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0;

  if (!survey || !result) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient py-8 px-5 text-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Din löneanalys är klar
          </h1>
          <p className="text-sm sm:text-base text-primary-foreground/80 mt-2">
            Vi har jämfört din lön med ramavtalspriserna i {survey.kommun}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        {/* Verdict card */}
        <Card className="card-shadow border-destructive/30 overflow-hidden">
          <div className="bg-destructive/10 p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <p className="font-semibold text-foreground">
              {isUnderpaid
                ? `Du kan tjäna upp till ${diffPercent}% mer`
                : "Din lön ligger nära marknadspris"}
            </p>
          </div>
          <CardContent className="pt-6">
            {/* Blurred bar chart mockup */}
            <div className="relative">
              <div className="space-y-4">
                <BarRow label="Din nuvarande lön" value={userHourly} max={result.high + 50} color="bg-muted-foreground/30" />
                <BarRow label="Marknadspris (ramavtal)" value={result.high} max={result.high + 50} color="bg-primary" blurred />
                <BarRow label="Rekommenderad lön" value={result.low} max={result.high + 50} color="bg-accent" blurred />
              </div>

              {/* Blur overlay on market data */}
              <div className="absolute inset-0 top-[60px] flex items-center justify-center">
                <div className="backdrop-blur-md bg-card/60 rounded-xl p-6 text-center border border-border card-shadow">
                  <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="font-semibold text-foreground text-sm">Lås upp full analys</p>
                  <p className="text-xs text-muted-foreground mt-1">Se exakta siffror och förhandlingstips</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What's included */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-display text-lg text-foreground">I din rapport får du:</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Exakt beräknad bruttolön baserat på ramavtal",
                "Jämförelse mot andra regioner och zoner",
                "Lista på godkända leverantörer",
                "Förhandlingsrekommendationer",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* CTA buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate("/rapport")}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all"
          >
            Köp rapport — 49 kr
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/rapport")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all"
          >
            Årsabonnemang — 495 kr/år
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Engångsbetalning · Ingen bindningstid · Stripe säker betalning
          </p>
        </div>
      </main>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
  blurred = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  blurred?: boolean;
}) {
  const width = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${blurred ? "blur-sm select-none" : "text-foreground"}`}>
          {value} kr/h
        </span>
      </div>
      <div className="h-6 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
