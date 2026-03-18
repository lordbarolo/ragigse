import { useState, useMemo } from "react";
import { Radio, Search, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import RadarFilters from "@/components/radar/RadarFilters";
import PredictionCard from "@/components/radar/PredictionCard";
import PredictionDetail from "@/components/radar/PredictionDetail";
import RadarEmptyState from "@/components/radar/RadarEmptyState";
import BottomNav from "@/components/radar/BottomNav";
import { Prediction } from "@/components/radar/radarMockData";
import { useToast } from "@/hooks/use-toast";

interface RadarResponse {
  predictions: Prediction[];
  filters: {
    competences: string[];
    locations: string[];
    buyers: string[];
  };
}

async function fetchPredictions(filters: {
  competence: string;
  location: string;
  buyer: string;
}): Promise<RadarResponse> {
  const params = new URLSearchParams();
  if (filters.competence) params.set("competence", filters.competence);
  if (filters.location) params.set("location", filters.location);
  if (filters.buyer) params.set("buyer", filters.buyer);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/radar-predictions?${params.toString()}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  });

  if (!res.ok) throw new Error("Kunde inte hämta prognoser");
  return res.json();
}

export default function Radar() {
  const [filters, setFilters] = useState({ competence: "", location: "", buyer: "" });
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortByProbability, setSortByProbability] = useState(true);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ["radar-predictions", filters],
    queryFn: () => fetchPredictions(filters),
    staleTime: 60_000,
  });

  const rawPredictions = data?.predictions ?? [];
  const predictions = useMemo(() => {
    if (!sortByProbability) return rawPredictions;
    const statusOrder = { high: 0, medium: 1, watch: 2 };
    return [...rawPredictions].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [rawPredictions, sortByProbability]);
  const filterOptions = data?.filters ?? { competences: [], locations: [], buyers: [] };

  const handleOpen = (p: Prediction) => {
    setSelectedPrediction(p);
    setDetailOpen(true);
  };

  const handleWatch = (p: Prediction) => {
    toast({
      title: "Bevakning skapad",
      description: `Du bevakar nu ${p.competence} i ${p.location}.`,
    });
  };

  const scrollToList = () => {
    document.getElementById("radar-list")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="px-5 pt-6 pb-2">
        <span className="font-display font-extrabold tracking-tight text-foreground text-[18px]">
          comp<em className="text-primary not-italic">care</em>
        </span>
      </header>

      {/* Hero */}
      <section className="px-5 pt-4 pb-6">
        <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3 py-1 text-[11px] font-medium font-display text-primary tracking-wider mb-4">
          <Radio className="w-3.5 h-3.5" />
          Prognos baserad på historiska mönster
        </div>
        <h1
          className="font-display text-foreground mb-2"
          style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Se vilka uppdrag som sannolikt{" "}
          <span className="text-primary">kommer snart</span>
        </h1>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[380px] mb-5">
          Radar analyserar historiska avrop och visar återkommande mönster i efterfrågan.
        </p>
        <div className="flex gap-2.5">
          <button className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-primary/90">
            <Radio className="w-4 h-4" />
            Bevaka uppdrag
          </button>
          <button
            onClick={scrollToList}
            className="flex items-center gap-2 rounded-xl border border-border text-foreground px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-secondary"
          >
            <Search className="w-4 h-4" />
            Utforska marknaden
          </button>
        </div>
      </section>

      {/* Filters — sticky on mobile */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-5 py-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <RadarFilters
            competence={filters.competence}
            location={filters.location}
            buyer={filters.buyer}
            filterOptions={filterOptions}
            onChange={setFilters}
          />
        </div>
        <button
          onClick={() => setSortByProbability((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
            sortByProbability
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground"
          }`}
        >
          <Radio className="w-3 h-3" />
          Sannolikhet hög → låg
        </button>
      </div>

      {/* Prediction list */}
      <section id="radar-list" className="px-5 pt-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-[13px]">Analyserar mönster…</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-[13px]">
            Kunde inte hämta prognoser. Försök igen.
          </div>
        ) : predictions.length === 0 ? (
          <RadarEmptyState />
        ) : (
          predictions.map((p) => (
            <PredictionCard
              key={p.id}
              prediction={p}
              onOpen={handleOpen}
              onWatch={handleWatch}
            />
          ))
        )}
      </section>

      {/* Detail sheet */}
      <PredictionDetail
        prediction={selectedPrediction}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
