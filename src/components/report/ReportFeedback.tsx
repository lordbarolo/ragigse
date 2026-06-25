import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type Value = "yes" | "no";

interface Props {
  leadId: string;
  role?: string;
  zone?: string;
}

export default function ReportFeedback({ leadId, role, zone }: Props) {
  const [selected, setSelected] = useState<Value | null>(null);
  const [sending, setSending] = useState<Value | null>(null);

  useEffect(() => {
    if (!leadId) return;
    supabase.functions
      .invoke("check-feedback", { body: { lead_id: leadId } })
      .then(({ data }) => {
        if (data?.has_feedback) {
          // Visa bekräftelse, men vi vet inte vilket val det var → markera som "tack"
          setSelected((prev) => prev ?? (data.rating === "no" ? "no" : "yes"));
        }
      })
      .catch(() => {});
  }, [leadId]);

  const handleSelect = async (value: Value) => {
    if (sending || selected) return;
    setSending(value);
    setSelected(value); // optimistisk visning — användaren stannar kvar
    trackEvent("report_feedback", { value, role: role || "", zone: zone || "" });

    await supabase.from("report_feedback").insert({
      lead_id: leadId,
      rating: value,
      role: role || null,
      zone: zone || null,
    });

    setSending(null);
  };

  const isDisabled = !!sending || !!selected;

  return (
    <Card className="bg-background border-border/60">
      <CardContent className="py-6 space-y-4">
        <p className="text-sm font-medium text-foreground text-center">
          {selected ? "Tack för din feedback 🙏" : "Gillar du rapporten?"}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Tumme upp"
            aria-pressed={selected === "yes"}
            disabled={isDisabled}
            onClick={() => handleSelect("yes")}
            className={`flex items-center justify-center w-14 h-14 rounded-full border transition-colors ${
              selected === "yes"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
            } ${isDisabled && selected !== "yes" ? "opacity-40" : ""} disabled:cursor-default`}
          >
            <ThumbsUp className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Tumme ner"
            aria-pressed={selected === "no"}
            disabled={isDisabled}
            onClick={() => handleSelect("no")}
            className={`flex items-center justify-center w-14 h-14 rounded-full border transition-colors ${
              selected === "no"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
            } ${isDisabled && selected !== "no" ? "opacity-40" : ""} disabled:cursor-default`}
          >
            <ThumbsDown className="w-6 h-6" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
