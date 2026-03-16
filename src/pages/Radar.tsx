import { useState, useMemo } from "react";
import { Radio, Search } from "lucide-react";
import RadarFilters from "@/components/radar/RadarFilters";
import PredictionCard from "@/components/radar/PredictionCard";
import PredictionDetail from "@/components/radar/PredictionDetail";
import RadarEmptyState from "@/components/radar/RadarEmptyState";
import BottomNav from "@/components/radar/BottomNav";
import { MOCK_PREDICTIONS, Prediction } from "@/components/radar/radarMockData";
import { useToast } from "@/hooks/use-toast";

export default function Radar() {
  const [filters, setFilters] = useState({ competence: "", location: "", buyer: "" });
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return MOCK_PREDICTIONS.filter((p) => {
      if (filters.competence && p.competence !== filters.competence) return false;
      if (filters.location && p.location !== filters.location) return false;
      if (filters.buyer && p.buyer !== filters.buyer) return false;
      return true;
    });
  }, [filters]);

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
        <RadarFilters
          competence={filters.competence}
          location={filters.location}
          buyer={filters.buyer}
          onChange={setFilters}
        />
      </div>

      {/* Prediction list */}
      <section id="radar-list" className="px-5 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <RadarEmptyState />
        ) : (
          filtered.map((p) => (
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
