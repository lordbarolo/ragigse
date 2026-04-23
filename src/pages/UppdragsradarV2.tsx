import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Radar, Flame, TrendingUp, Sun } from "lucide-react";
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

type RoleGroup = "lakare" | "ssk" | "fysio";

const CATEGORIES: { value: RoleGroup; label: string; profession: string }[] = [
  { value: "lakare", label: "Läkare", profession: "DOCTOR" },
  { value: "ssk", label: "Sjuksköterska / Barnmorska", profession: "NURSE" },
  { value: "fysio", label: "Fysioterapeut", profession: "PHYSIOTHERAPIST" },
];

// Pretty-print specialization codes like "DOCTOR_ANESTESIOCHINTENSIVVARD" → "Anestesi och intensivvård"
const SPEC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/och/g, " och "],
  [/sjukdomar/g, "sjukdomar"],
  [/sjukvard/g, "sjukvård"],
  [/medicin/g, "medicin"],
  [/kirurgi/g, "kirurgi"],
];

function prettySpec(code: string | null | undefined): string {
  if (!code) return "—";
  const stripped = code.replace(/^(DOCTOR|NURSE|PHYSIOTHERAPIST)_/, "");
  if (stripped === "NONE" || stripped === "GENERIC_SPECIALIZATION") return "Allmän";
  let s = stripped.toLowerCase();
  // Insert spaces around common Swedish word stems
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
  // Capitalize first letter
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

function monthsAhead(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  const cur = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cur <= end) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export default function UppdragsradarV2() {
  const [horizon, setHorizon] = useState("30");
  const [region, setRegion] = useState<string>("__all");
  const [category, setCategory] = useState<RoleGroup | "__all">("__all");
  const [specialization, setSpecialization] = useState<string>("__all");
  const [onlyHighConfidence, setOnlyHighConfidence] = useState(false);

  useEffect(() => {
    document.title = "Uppdragsradar – Top 20 prognoser | CompCare";
    const desc = "Top 20 förväntade avrop kommande 30/60/90 dagar baserat på historiska mönster.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  const months = useMemo(() => monthsAhead(parseInt(horizon, 10)), [horizon]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["urdp-all", months],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("uppdragsradar_predictions")
        .select("*")
        .in("month", months);
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
    staleTime: 5 * 60_000,
  });

  const regions = useMemo(() => {
    const s = new Set<string>();
    data?.forEach((d) => d.region && s.add(d.region));
    return Array.from(s).sort();
  }, [data]);

  // Reset specialization when category changes
  useEffect(() => {
    setSpecialization("__all");
  }, [category]);

  const selectedProfessionCode = useMemo(
    () => (category === "__all" ? null : CATEGORIES.find((c) => c.value === category)?.profession ?? null),
    [category],
  );

  // Specialization options driven by data + selected category
  const specializationOptions = useMemo(() => {
    if (!data || !selectedProfessionCode) return [];
    const codes = new Set<string>();
    data.forEach((d) => {
      if (d.profession === selectedProfessionCode && d.specialization) codes.add(d.specialization);
    });
    return Array.from(codes)
      .map((code) => ({ value: code, label: prettySpec(code) }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));
  }, [data, selectedProfessionCode]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data;
    if (region !== "__all") rows = rows.filter((r) => r.region === region);
    if (selectedProfessionCode) rows = rows.filter((r) => r.profession === selectedProfessionCode);
    if (specialization !== "__all") rows = rows.filter((r) => r.specialization === specialization);
    if (onlyHighConfidence) rows = rows.filter((r) => r.confidence === "high");
    return [...rows]
      .sort((a, b) => (b.expected_calloffs ?? 0) - (a.expected_calloffs ?? 0))
      .slice(0, 20);
  }, [data, region, selectedProfessionCode, specialization, onlyHighConfidence]);

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

  return (
    <div className="min-h-screen bg-background">
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
              Top 20 förväntade avrop kommande {horizon} dagar — sorterat på prognostiserat antal.
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
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Label className="text-xs">Profession</Label>
              <Select value={profession} onValueChange={setProfession}>
                <SelectTrigger><SelectValue placeholder="Alla yrken" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Alla yrken</SelectItem>
                  {professions.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <CardTitle className="text-base">Top 20 prognoser</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">Hämtar prognoser…</span>
              </div>
            ) : error ? (
              <div className="text-center py-16 text-destructive text-sm">
                Kunde inte hämta prognoser.
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Inga rader matchar filtren.
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
                    // Färgkodning enligt spec
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
                        <TableCell className="text-sm">{r.profession ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.specialization ?? "—"}
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
          Datakälla: <code>uppdragsradar_predictions</code> · Färg: gul = säsongstopp, röd = trendbrott.
        </p>
      </div>
    </div>
  );
}
