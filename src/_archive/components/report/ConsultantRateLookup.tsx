import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { fmt } from "@/shared/formatters";

interface Props {
  occupation: string;
  kommun: string;
  sector?: string;
}

export default function ConsultantRateLookup({ occupation, kommun, sector }: Props) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleLoad = async () => {
    if (!occupation || !kommun) return;
    setLoading(true);
    try {
      const { data: locData } = await supabase
        .from("locations")
        .select("zon")
        .eq("kommun", kommun)
        .limit(1);
      const zon = locData?.[0]?.zon || "Zon 1";

      const { data: exactMatch } = await supabase
        .from("rates")
        .select("timpris_kund")
        .eq("yrkeskategori", occupation)
        .eq("zon", zon)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        setRate(exactMatch[0].timpris_kund);
        return;
      }

      const { data: prefixMatch } = await supabase
        .from("rates")
        .select("timpris_kund")
        .ilike("yrkeskategori", `${occupation}%`)
        .eq("zon", zon)
        .limit(1);

      if (prefixMatch && prefixMatch.length > 0) {
        setRate(prefixMatch[0].timpris_kund);
        return;
      }

      const { data: anyMatch } = await supabase
        .from("rates")
        .select("typ")
        .ilike("yrkeskategori", `${occupation}%`)
        .limit(1);

      if (anyMatch && anyMatch.length > 0) {
        const { data: zoneRate } = await supabase
          .from("rates")
          .select("timpris_kund")
          .eq("typ", anyMatch[0].typ)
          .eq("zon", zon)
          .limit(1);
        if (zoneRate && zoneRate.length > 0) {
          setRate(zoneRate[0].timpris_kund);
          return;
        }
      }

      toast({ title: "Ingen konsultdata hittades för detta yrke", variant: "destructive" });
    } catch {
      toast({ title: "Kunde inte hämta konsultdata", variant: "destructive" });
    } finally {
      setLoading(false);
      setExpanded(true);
    }
  };

  return (
    <Card className="card-shadow border-primary/20">
      <CardContent className="pt-5 pb-5">
        <button
          className="w-full flex items-center justify-between gap-3 text-left"
          onClick={() => {
            if (!expanded && rate === null) {
              handleLoad();
            } else {
              setExpanded((v) => !v);
            }
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Vad tjänar konsulter i samma roll?</p>
              <p className="text-xs text-muted-foreground">Se vad en inhyrd kollega fakturerar per timme</p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
          ) : expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            {rate !== null ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Kundpris (ramavtal)</p>
                    <p className="text-lg font-bold text-foreground">{fmt(rate)} kr/h</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <p className="text-xs text-muted-foreground mb-1">Konsultens andel (~85%)</p>
                    <p className="text-lg font-bold text-accent">{fmt(Math.round(rate * 0.85))} kr/h</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ≈ {fmt(Math.round(rate * 0.85 * 167))} kr/mån
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  En {occupation} som arbetar via bemanningsföretag faktureras i {kommun}-regionen till {fmt(rate)} kr/h mot kunden. Som konsult behåller du vanligtvis 85–90% av detta.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Källa: SKR/Kammarkollegiet ramavtal{sector ? ` · Sektor: ${sector}` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Ingen konsultdata hittades för denna roll i din region.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
