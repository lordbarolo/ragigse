import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Radio, Search, Loader2 } from "lucide-react";
import ReijdarPromo from "@/components/radar/ReijdarPromo";
import { useInfiniteQuery } from "@tanstack/react-query";
import RadarFilters from "@/components/radar/RadarFilters";
import PredictionCard from "@/components/radar/PredictionCard";
import PredictionDetail from "@/components/radar/PredictionDetail";
import RadarEmptyState from "@/components/radar/RadarEmptyState";
import BottomNav from "@/components/radar/BottomNav";
import ReijdarChat from "@/components/radar/ReijdarChat";
import { Prediction } from "@/components/radar/radarMockData";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 20;

interface RadarResponse {
  predictions: Prediction[];
  total: number;
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
}, page: number): Promise<RadarResponse> {
  const params = new URLSearchParams();
  if (filters.competence) params.set("competence", filters.competence);
  if (filters.location) params.set("location", filters.location);
  if (filters.buyer) params.set("buyer", filters.buyer);
  params.set("page", String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/radar-predictions?${params.toString()}`;
  const res = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });

  if (!res.ok) throw new Error("Kunde inte hämta prognoser");
  return res.json();
}

export default function Radar() {
  const [filters, setFilters] = useState({ competence: "", location: "", buyer: "" });
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();
  const { user } = useAuth();
  const { toast } = useToast();
  const observerRef = useRef<HTMLDivElement | null>(null);

  // SEO metadata
  useEffect(() => {
    document.title = "Uppdragsradar – Se kommande uppdrag | CompCare";
    const meta = document.querySelector('meta[name="description"]');
    const desc = "Prognos för kommande vårduppdrag baserat på historiska mönster. Se vilka regioner och köpare som sannolikt behöver bemanning snart.";
    if (meta) { meta.setAttribute("content", desc); }
    else { const m = document.createElement("meta"); m.name = "description"; m.content = desc; document.head.appendChild(m); }
  }, []);

  // Load user's default competence from profile or latest report
  useEffect(() => {
    if (profileLoaded) return;
    const loadDefault = async () => {
      if (user) {
        // Try consultant_profiles first (via specialty)
        const { data: profile } = await supabase
          .from("consultant_profiles")
          .select("specialty_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.specialty_id) {
          // We don't have specialty name directly; try reports instead
        }

        // Fall back to latest report occupation
        const { data: report } = await supabase
          .from("reports")
          .select("occupation")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (report?.occupation) {
          setFilters(f => ({ ...f, competence: report.occupation }));
        }
      }
      setProfileLoaded(true);
    };
    loadDefault();
  }, [user, profileLoaded]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["radar-predictions", filters],
    queryFn: ({ pageParam = 0 }) => fetchPredictions(filters, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.predictions.length, 0);
      return loaded < lastPage.total ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 60_000,
    enabled: profileLoaded,
  });

  const predictions = useMemo(
    () => data?.pages.flatMap((p) => p.predictions) ?? [],
    [data]
  );
  const filterOptions = data?.pages[0]?.filters ?? { competences: [], locations: [], buyers: [] };

  // Infinite scroll observer
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) return;
      if (observerRef.current) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });
      if (node) observer.observe(node);
      observerRef.current = node;
      return () => observer.disconnect();
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage]
  );

  const handleOpen = (p: Prediction) => {
    setSelectedPrediction(p);
    setDetailOpen(true);
  };

  const handleWatch = async (p: Prediction) => {
    if (!user) {
      toast({ title: "Logga in", description: "Du behöver ett konto för att bevaka uppdrag." });
      return;
    }

    const { error } = await supabase.from("radar_watchlist").insert({
      user_id: user.id,
      competence: p.competence,
      location: p.location,
      buyer: p.buyer,
      predicted_date: p.predictedDate,
    });

    if (error) {
      toast({ title: "Kunde inte spara", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Bevakning skapad ✓",
        description: `Du bevakar nu ${p.competence} hos ${p.buyer}.`,
      });
    }
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
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[380px] mb-1">
          Radar analyserar historiska uppdrag och visar återkommande mönster i efterfrågan.
        </p>
        <p className="text-[12px] text-muted-foreground/70 leading-relaxed max-w-[380px] mb-5">
          🔮 = Viss chans  · 🔮🔮 = Tydlig chans · 🔮🔮🔮 = Stor chans
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

      {/* Filters */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border px-5 py-3">
        <RadarFilters
          competence={filters.competence}
          location={filters.location}
          buyer={filters.buyer}
          filterOptions={filterOptions}
          onChange={setFilters}
        />
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
          <>
            {predictions.map((p, i) => (
              <div key={p.id}>
                <div ref={i === predictions.length - 1 ? lastElementRef : undefined}>
                  <PredictionCard
                    prediction={p}
                    onOpen={handleOpen}
                    onWatch={handleWatch}
                  />
                </div>
                {(i === 2 || i === predictions.length - 1) && <div className="mt-3"><ReijdarPromo onAsk={(q) => setPendingQuestion(q)} /></div>}
              </div>
            ))}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            )}
          </>
        )}
      </section>

      {/* Detail sheet */}
      <PredictionDetail
        prediction={selectedPrediction}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />

      {/* Reijdar AI chat */}
      <ReijdarChat selectedRole={filters.competence} />

      {/* Bottom nav */}
      <BottomNav />
    </div>
  );
}
