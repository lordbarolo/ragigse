import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  role: string | null;
  region: string | null;
  employmentType: string | null;
  currentRate: number | null;
}

interface PricingResponse {
  facts?: {
    role: string;
    region: string;
    zone: string;
    employmentType: string;
    customerPriceHour: number;
    expectedRangeHour: { min: number; max: number };
    suggestedFloor: number;
    currentRate: number | null;
  };
  commentary?: string;
}

const fmt = (n: number) => n.toLocaleString("sv-SE");

export default function AiPricingCoach({ role, region, employmentType, currentRate }: Props) {
  const [data, setData] = useState<PricingResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAdvice = async () => {
    if (!role || !region) {
      toast.error("Ange roll och region i din profil först.");
      return;
    }
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("ai-pricing-coach", {
        body: { role, region, employmentType, currentRate },
      });
      if (error) throw error;
      if ((resp as any)?.error) {
        toast.error((resp as any)?.message || "Kunde inte hämta marknadskommentar.");
        return;
      }
      setData(resp as PricingResponse);
    } catch (err: any) {
      if (err?.context?.status === 429) toast.error("Du har nått dagens AI-gräns.");
      else if (err?.context?.status === 402) toast.error("AI-krediter saknas.");
      else toast.error(err?.message || "Kunde inte hämta marknadskommentar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Smart prissättning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data ? (
          <>
            <p className="text-sm text-muted-foreground">
              Få en neutral marknadskommentar baserad på SKR-ramavtal för din roll och region.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={fetchAdvice}
              disabled={loading || !role || !region}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? "Analyserar…" : "Analysera mitt timpris"}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            {data.facts && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ramavtal</p>
                  <p className="text-sm font-semibold">{fmt(data.facts.customerPriceHour)} kr/h</p>
                  <p className="text-[10px] text-muted-foreground">{data.facts.zone}</p>
                </div>
                <div className="rounded-lg bg-primary/[0.06] p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spann</p>
                  <p className="text-sm font-semibold">{fmt(data.facts.expectedRangeHour.min)}–{fmt(data.facts.expectedRangeHour.max)}</p>
                  <p className="text-[10px] text-muted-foreground">kr/h</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Nuvarande</p>
                  <p className="text-sm font-semibold">{data.facts.currentRate ? `${fmt(data.facts.currentRate)} kr/h` : "—"}</p>
                </div>
              </div>
            )}
            {data.commentary && (
              <div className="rounded-lg bg-primary/[0.04] border border-primary/15 p-3">
                <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{data.commentary}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">AI-genererad neutral marknadskommentar. Inga peer-jämförelser.</p>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => { setData(null); }}
            >
              Återställ
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
