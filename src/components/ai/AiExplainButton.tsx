import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  topic: "zone_rates" | "salary_zones" | "upcoming_assignments";
  role: string | null;
  region: string | null;
  employmentType: string | null;
  data: unknown;
  label?: string;
}

export default function AiExplainButton({ topic, role, region, employmentType, data, label = "Förklara med AI" }: Props) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    if (explanation) {
      setExplanation(null);
      return;
    }
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("ai-explain-insight", {
        body: { topic, role, region, employmentType, data },
      });
      if (error) throw error;
      if ((resp as any)?.error) {
        toast.error((resp as any)?.message || "Kunde inte förklara just nu.");
        return;
      }
      setExplanation((resp as { explanation: string }).explanation || "Ingen förklaring tillgänglig.");
    } catch (err: any) {
      const msg = err?.context?.body ? JSON.parse(err.context.body)?.message : err?.message;
      if (err?.context?.status === 429) {
        toast.error("Du har nått dagens AI-gräns. Återställs vid midnatt.");
      } else if (err?.context?.status === 402) {
        toast.error("AI-krediter saknas. Kontakta admin.");
      } else {
        toast.error(msg || "Kunde inte hämta förklaring.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs gap-1.5 text-primary hover:text-primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {explanation ? "Dölj förklaring" : label}
      </Button>
      {explanation && (
        <div className="rounded-lg bg-primary/[0.04] border border-primary/15 p-3">
          <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">{explanation}</p>
          <p className="mt-2 text-[10px] text-muted-foreground">AI-genererad sammanfattning baserad på SKR-ramavtal. Granska alltid själv.</p>
        </div>
      )}
    </div>
  );
}
