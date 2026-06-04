import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radar, Flame, TrendingUp, Sun, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import SearchableSelect from "@/components/SearchableSelect";
import { SEO } from "@/components/SEO";

type RoleGroup = "lakare" | "ssk" | "fysio";

const CATEGORIES: { value: RoleGroup; label: string; profession: string }[] = [
  { value: "lakare", label: "Läkare", profession: "DOCTOR" },
  { value: "ssk", label: "Sjuksköterska / Barnmorska", profession: "NURSE" },
  { value: "fysio", label: "Fysioterapeut", profession: "PHYSIOTHERAPIST" },
];

function prettySpec(code: string | null | undefined): string {
  if (!code) return "—";
  const stripped = code.replace(/^(DOCTOR|NURSE|PHYSIOTHERAPIST)_/, "");
  if (stripped === "NONE" || stripped === "GENERIC_SPECIALIZATION") return "Allmän";
  let s = stripped.toLowerCase();
  s = s
    .replace(/och/g, " och ")
    .replace(/oc h/g, " och ")
    .replace(/avaldre/g, "av äldre")
    .replace(/sjukvard/g, "sjukvård")
    .replace(/varden/g, "vården")
    .replace(/halssjukdomar/g, "halssjukdomar")
    .replace(/konssjukdomar/g, "könssjukdomar")
    .replace(/ogonsjukdomar/g, "ögonsjukdomar")
    .replace(/oronnasa/g, "öron-, näs- och ")
    .replace(/aldre/g, "äldre")
    .replace(/karl/g, "kärl")
    .replace(/halso/g, "hälso")
    .replace(/gynekologi/g, "gynekologi")
    .replace(/sjukskoterska/g, "sjuksköterska")
    .replace(/kompetens/g, "kompetens");
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/\s+/g, " ").trim();
}

function prettyProfession(code: string | null | undefined): string {
  if (!code) return "—";
  const cat = CATEGORIES.find((c) => c.profession === code);
  return cat?.label ?? code;
}

type Prediction = {
  id: string;
  customer: string;
  region: string | null;
  profession: string | null;
  specialization: string | null;
  month: string;
  expected_calloffs: number | null;
  expected_calloffs_display: number | null;
  confidence: "low" | "med" | "high" | null;
  is_seasonal_peak: boolean | null;
  is_trend_break: boolean | null;
  trend_ratio: number | null;
};

const HORIZONS = [
  { value: "30", label: "30 dagar" },
  { value: "60", label: "60 dagar" },
  { value: "90", label: "90 dagar" },
];

async function callRadar<T>(payload: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.functions.invoke("radar-data", { body: payload });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(String((data as { error: string }).error));
  }
  return ((data as { rows?: T[] })?.rows ?? []) as T[];
}

export default function UppdragsradarV2() {
  const [horizon, setHorizon] = useState("30");
  const [region, setRegion] = useState<string>("__all");
  const [category, setCategory] = useState<RoleGroup | "__all">("__all");
  const [specialization, setSpecialization] = useState<string>("__all");
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(false);

  const radarJsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "CompCare Uppdragsradar",
      description:
        "Prognos för kommande vårduppdrag (avrop) i Sverige baserad på historiska avropsmönster från regioner och kommuner. Visar förväntad volym per kund, region, profession och månad.",
      url: "https://www.compcare.se/uppdragsradar",
      creator: { "@type": "Organization", name: "CompCare", url: "https://www.compcare.se" },
      keywords: ["avrop", "vårduppdrag", "bemanning", "prognos", "ramavtal", "Sverige"],
      isAccessibleForFree: true,
      license: "https://www.compcare.se/integritetspolicy",
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl:
            "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/predictions",
          name: "Uppdragsradar Public API — predictions",
        },
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl:
            "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/customer_intelligence",
          name: "Uppdragsradar Public API — customer intelligence",
        },
      ],
      potentialAction: {
        "@type": "SearchAction",
        target:
          "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/predictions?region={region}&profession={profession}",
        "query-input": ["required name=region", "required name=profession"],
      },
    }),
    [],
  );

  const selectedProfessionCode = useMemo(
    () => (category === "__all" ? null : CATEGORIES.find((c) => c.value === category)?.profession ?? null),
    [category],
  );

  // Reset specialization when category changes
  useEffect(() => {
    setSpecialization("__all");
  }, [category]);

  // --- Regions (metadata, cached long) ---
  const { data: regions = [] } = useQuery({
    queryKey: ["radar-regions"],
    queryFn: () => callRadar<{ region: string }>({ endpoint: "regions" }).then((r) => r.map((x) => x.region)),
    staleTime: 30 * 60_000,
  });

  // --- Specializations (only when category chosen) ---
  const { data: specializationOptions = [] } = useQuery({
    queryKey: ["radar-specs", selectedProfessionCode],
    queryFn: async () => {
      if (!selectedProfessionCode) return [];
      const rows = await callRadar<{ specialization: string }>({
        endpoint: "specializations",
        profession: selectedProfessionCode,
      });
      return rows
        .map((r) => ({ value: r.specialization, label: prettySpec(r.specialization) }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv"));
    },
    enabled: !!selectedProfessionCode,
    staleTime: 30 * 60_000,
  });

  // --- Predictions (server-side filtered & sorted top-N) ---
  const { data: filtered = [], isLoading, error } = useQuery({
    queryKey: ["radar-predictions", horizon, region, selectedProfessionCode, specialization, onlyHighConfidence],
    queryFn: () => callRadar<Prediction>({
      endpoint: "predictions",
      horizon: parseInt(horizon, 10),
      ...(region !== "__all" ? { region } : {}),
      ...(selectedProfessionCode ? { profession: selectedProfessionCode } : {}),
      ...(specialization !== "__all" ? { specialization } : {}),
      only_high_confidence: onlyHighConfidence,
    }),
    staleTime: 5 * 60_000,
  });

  const peakCount = filtered.filter((r) => r.is_seasonal_peak).length;
  const breakCount = filtered.filter((r) => r.is_trend_break).length;
  const totalExpected = filtered.reduce(
    (sum, r) => sum + (r.expected_calloffs_display ?? Math.round(r.expected_calloffs ?? 0)),
    0,
  );

  const confidenceVariant = (c: Prediction["confidence"]) => {
    if (c === "high") return "default" as const;
    if (c === "med") return "secondary" as const;
    return "outline" as const;
  };

  const isRateLimited = error instanceof Error && /Rate limit/i.test(error.message);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Uppdragsradar – Top 25 prognoser | CompCare"
        description="Top 25 förväntade vårdavrop kommande 30/60/90 dagar baserat på historiska mönster från regioner och kommuner."
        path="/uppdragsradar"
        jsonLd={radarJsonLd}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 mt-0.5">
            <Radar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
              Uppdragsradar
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Top 25 förväntade avrop kommande {horizon} dagar — sorterat på prognostiserat antal.
            </p>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium">Förväntade avrop</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalExpected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-yellow-500" /> Säsongstoppar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{peakCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-destructive" /> Trendbrott
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{breakCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Visade rader
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{filtered.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tidshorisont</Label>
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((h) => (
                    <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue placeholder="Alla regioner" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Alla regioner</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Yrkeskategori</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as RoleGroup | "__all")}>
                <SelectTrigger><SelectValue placeholder="Alla yrken" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Alla yrken</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Specialisering</Label>
              {category === "__all" ? (
                <Select disabled value="__all">
                  <SelectTrigger>
                    <SelectValue placeholder="Välj yrke först" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              ) : (
                <SearchableSelect
                  options={[
                    { value: "__all", label: "Alla specialiseringar" },
                    ...specializationOptions,
                  ]}
                  value={specialization}
                  onValueChange={setSpecialization}
                  placeholder="Sök specialisering…"
                />
              )}
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={onlyHighConfidence}
                  onCheckedChange={(v) => setOnlyHighConfidence(v === true)}
                />
                Endast hög konfidens
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 25 prognoser</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2" aria-label="Laddar prognoser">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))}
              </div>
            ) : isRateLimited ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                <ShieldAlert className="w-8 h-8 text-destructive" />
                <div className="text-sm font-medium text-foreground">För många förfrågningar</div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  Du har nått timgränsen för datalänkning (30 förfrågningar/timme).
                  Vänta en stund och försök igen.
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">Kunde inte hämta prognoser</div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  Något gick fel mot datakällan. Försök igen om en stund.
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-3">
                <Radar className="w-8 h-8 text-muted-foreground/60" />
                <div className="text-sm font-medium text-foreground">Inga prognoser matchar filtren</div>
                <div className="text-xs text-muted-foreground max-w-sm">
                  Prova att vidga sökningen — välj "Alla yrken" eller "Alla regioner".
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Spec.</TableHead>
                    <TableHead>Månad</TableHead>
                    <TableHead className="text-right">Förväntat</TableHead>
                    <TableHead>Konfidens</TableHead>
                    <TableHead>Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r, i) => {
                    const rowClass = r.is_trend_break
                      ? "bg-destructive/10 hover:bg-destructive/15"
                      : r.is_seasonal_peak
                        ? "bg-yellow-500/10 hover:bg-yellow-500/15"
                        : "";
                    const expected =
                      r.expected_calloffs_display ?? Math.round(r.expected_calloffs ?? 0);
                    return (
                      <TableRow key={r.id} className={rowClass}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.customer}</TableCell>
                        <TableCell className="text-sm">{r.region ?? "—"}</TableCell>
                        <TableCell className="text-sm">{prettyProfession(r.profession)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {prettySpec(r.specialization)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{r.month}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {expected}
                        </TableCell>
                        <TableCell>
                          <Badge variant={confidenceVariant(r.confidence)} className="capitalize">
                            {r.confidence ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {r.is_seasonal_peak && (
                              <Badge variant="outline" className="border-yellow-500/40 text-yellow-700 dark:text-yellow-400 gap-1">
                                <Sun className="w-3 h-3" /> Topp
                              </Badge>
                            )}
                            {r.is_trend_break && (
                              <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
                                <Flame className="w-3 h-3" /> Brott
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Server-medierad åtkomst · Max 25 rader/anrop · 30 förfrågningar/timme · Färg: gul = säsongstopp, röd = trendbrott.
        </p>
      </div>
    </div>
  );
}
