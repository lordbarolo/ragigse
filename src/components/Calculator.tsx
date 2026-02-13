import { useState, useMemo } from "react";
import { useLocations, useRates, calculateResult, type EmploymentType } from "@/hooks/useCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Stethoscope, MapPin, TrendingUp, Users, Briefcase } from "lucide-react";

export default function Calculator() {
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();

  const [selectedKommun, setSelectedKommun] = useState("");
  const [selectedYrke, setSelectedYrke] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("anstalld");

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === selectedKommun),
    [locations, selectedKommun]
  );

  const availableRates = useMemo(() => {
    if (!rates || !selectedLocation) return [];
    return rates.filter((r) => r.zon === selectedLocation.zon);
  }, [rates, selectedLocation]);

  const selectedRate = useMemo(() => {
    if (!availableRates.length || !selectedYrke) return null;
    // Exact match
    const exact = availableRates.find((r) => r.yrkeskategori === selectedYrke);
    if (exact) return exact;
    // Fallback: find closest by typ
    const selectedRateFull = rates?.find((r) => r.yrkeskategori === selectedYrke);
    if (!selectedRateFull) return null;
    const sameTyp = availableRates.filter((r) => r.typ === selectedRateFull.typ);
    return sameTyp[0] || null;
  }, [availableRates, selectedYrke, rates]);

  const result = useMemo(() => {
    if (!selectedRate) return null;
    return calculateResult(selectedRate.timpris_kund, employmentType);
  }, [selectedRate, employmentType]);

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

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Employment Type Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => setEmploymentType("anstalld")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 ${
            employmentType === "anstalld"
              ? "hero-gradient text-primary-foreground card-shadow-hover"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-5 h-5" />
          Anställd
        </button>
        <button
          onClick={() => setEmploymentType("foretagare")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-base transition-all duration-200 ${
            employmentType === "foretagare"
              ? "hero-gradient text-primary-foreground card-shadow-hover"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          <Briefcase className="w-5 h-5" />
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
              Kommun
            </Label>
            <Select value={selectedKommun} onValueChange={(v) => { setSelectedKommun(v); setSelectedYrke(""); }}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={isLoading ? "Laddar..." : "Välj din kommun"} />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((l) => (
                  <SelectItem key={l.id} value={l.kommun}>
                    {l.kommun} ({l.region})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLocation && (
              <p className="text-sm text-muted-foreground">
                {selectedLocation.region} · {selectedLocation.zon}
              </p>
            )}
          </div>

          {/* Yrke */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Stethoscope className="w-4 h-4 text-primary" />
              Yrkeskategori
            </Label>
            <Select value={selectedYrke} onValueChange={setSelectedYrke} disabled={!selectedKommun}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={!selectedKommun ? "Välj kommun först" : "Välj yrkeskategori"} />
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

      {/* Result */}
      {result && selectedRate && selectedLocation && (
        <Card className="card-shadow border-accent/30 overflow-hidden">
          <div className="success-gradient p-4">
            <CardTitle className="text-accent-foreground flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              {employmentType === "anstalld" ? "Din beräknade bruttolön" : "Din beräknade timersättning"}
            </CardTitle>
          </div>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold font-display text-foreground">
                {result.low} – {result.high} kr
              </p>
              <p className="text-muted-foreground mt-1">
                {employmentType === "anstalld" ? "per timme (bruttolön)" : "per timme (fakturerat)"}
              </p>
            </div>

            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ramavtalspris (timpris kund)</span>
                <span className="font-semibold">{selectedRate.timpris_kund} kr/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bemanningsbolagets marginal</span>
                <span className="font-semibold">10–15%</span>
              </div>
              {employmentType === "anstalld" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Arbetsgivaravgifter m.m. (÷ 1.42)</span>
                  <span className="font-semibold">Inkl.</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zon / Kommun</span>
                <span className="font-semibold">{selectedLocation.zon} · {selectedLocation.kommun}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Yrkeskategori</span>
                <span className="font-semibold">{selectedRate.yrkeskategori}</span>
              </div>
            </div>

            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
              <strong className="text-foreground">Så räknar vi:</strong>{" "}
              {employmentType === "anstalld"
                ? `Ramavtalspriset (${selectedRate.timpris_kund} kr) minus 10–15% marginal, delat med 1.42 för arbetsgivaravgifter, semester och tjänstepension.`
                : `Som egenföretagare får du 85–90% av ramavtalspriset (${selectedRate.timpris_kund} kr) direkt.`}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
