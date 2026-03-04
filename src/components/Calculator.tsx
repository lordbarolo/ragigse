import { useState, useMemo } from "react";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import type { EmploymentType } from "@/lib/calc";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Stethoscope, TrendingUp, Users, Briefcase, Loader2 } from "lucide-react";

export default function Calculator() {
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const { calculate, result, loading: calcLoading } = usePricingEngine();

  const [selectedKommun, setSelectedKommun] = useState("");
  const [selectedYrke, setSelectedYrke] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("anstalld");

  const uniqueYrken = useMemo(() => {
    if (!rates) return [];
    const seen = new Set<string>();
    return rates.filter((r) => {
      if (seen.has(r.yrkeskategori)) return false;
      seen.add(r.yrkeskategori);
      return true;
    });
  }, [rates]);

  const isLoading = locLoading || ratesLoading;

  // Trigger server-side calculation when all inputs are set
  const handleCalculate = (yrke: string, kommun: string, empType: EmploymentType) => {
    if (yrke && kommun) {
      calculate(yrke, kommun, empType);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 sm:space-y-6">
      {/* Employment Type Toggle */}
      <div className="flex gap-2 sm:gap-3">
        <button
          onClick={() => {
            setEmploymentType("anstalld");
            handleCalculate(selectedYrke, selectedKommun, "anstalld");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 ${
            employmentType === "anstalld"
              ? "hero-gradient text-primary-foreground card-shadow-hover"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          Anställd
        </button>
        <button
          onClick={() => {
            setEmploymentType("foretagare");
            handleCalculate(selectedYrke, selectedKommun, "foretagare");
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-sm sm:text-base transition-all duration-200 ${
            employmentType === "foretagare"
              ? "hero-gradient text-primary-foreground card-shadow-hover"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
          Egenföretagare
        </button>
      </div>

      {/* Selection Card */}
      <Card className="card-shadow border-border/50">
        <CardContent className="pt-6 space-y-5">
          {/* Kommun */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              Arbetsort
            </Label>
            <Select
              value={selectedKommun}
              onValueChange={(v) => {
                setSelectedKommun(v);
                setSelectedYrke("");
                // Clear result when kommun changes
              }}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder={isLoading ? "Laddar..." : "Välj din arbetsort"} />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((l) => (
                  <SelectItem key={l.id} value={l.kommun}>
                    {l.kommun} ({l.region})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Yrke */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Stethoscope className="w-4 h-4 text-primary" />
              Yrkeskategori
            </Label>
            <Select
              value={selectedYrke}
              onValueChange={(v) => {
                setSelectedYrke(v);
                handleCalculate(v, selectedKommun, employmentType);
              }}
              disabled={!selectedKommun}
            >
              <SelectTrigger className="h-12">
                <SelectValue placeholder={!selectedKommun ? "Välj arbetsort först" : "Välj yrkeskategori"} />
              </SelectTrigger>
              <SelectContent>
                {uniqueYrken.map((r) => (
                  <SelectItem key={r.id} value={r.yrkeskategori}>
                    {r.yrkeskategori}
                    {r.detaljer && ` — ${r.detaljer}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {calcLoading && (
        <Card className="card-shadow border-border/50">
          <CardContent className="pt-6 flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Beräknar...</span>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && !calcLoading && (
        <Card className="card-shadow border-accent/30 overflow-hidden">
          <div className="success-gradient p-4">
            <CardTitle className="text-accent-foreground flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              {result.employment_type === "anstalld" ? "Din beräknade bruttoersättning" : "Din beräknade timersättning"}
            </CardTitle>
          </div>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-bold font-display text-foreground">
                {result.recommended_hourly_min} – {result.recommended_hourly_max} kr
              </p>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                {result.employment_type === "anstalld" ? "per timme (bruttoersättning)" : "per timme (fakturerat)"}
              </p>
            </div>

            <div className="border-t pt-4 space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ramavtalspris (vad kunden betalar)</span>
                <span className="font-semibold">{result.rate_customer_sek_per_hour} kr/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bemanningsbolagets marginal</span>
                <span className="font-semibold">{result.employment_type === "foretagare" ? "10%" : "10–15%"}</span>
              </div>
              {result.employment_type === "anstalld" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arbetsgivaravgifter m.m. (÷ 1.42)</span>
                  <span className="font-semibold">Inkl.</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zon / Kommun</span>
                <span className="font-semibold">{result.zon} · {result.kommun}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yrkeskategori</span>
                <span className="font-semibold">{result.occupation}</span>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3 text-xs sm:text-sm text-muted-foreground">
              <strong className="text-foreground">Så räknar vi:</strong>{" "}
              {result.employment_type === "anstalld"
                ? `Ramavtalspriset (${result.rate_customer_sek_per_hour} kr) minus 10–15% marginal, delat med 1.42 för arbetsgivaravgifter, semester och tjänstepension.`
                : `Som egenföretagare får du 90% av ramavtalspriset (${result.rate_customer_sek_per_hour} kr) direkt, dvs ${result.recommended_hourly_max} kr/h.`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
