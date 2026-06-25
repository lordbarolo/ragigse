import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type Value = "yes" | "no";

interface Props {
  leadId: string;
  role?: string;
  zone?: string;
}

export default function ReportFeedback({ leadId, role, zone }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [alreadyFeedback, setAlreadyFeedback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState<Value | null>(null);

  useEffect(() => {
    if (!leadId) return;
    supabase.functions.invoke("check-feedback", { body: { lead_id: leadId } })
      .then(({ data }) => {
        if (data?.has_feedback) setAlreadyFeedback(true);
      })
      .catch(() => {});
  }, [leadId]);

  if (alreadyFeedback) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-5 text-center">
          <p className="text-sm text-muted-foreground">Tack för din feedback 🙏</p>
        </CardContent>
      </Card>
    );
  }

  const handleSelect = async (value: Value) => {
    if (sending) return;
    setSending(value);
    trackEvent("report_feedback", { value, role: role || "", zone: zone || "" });

    await supabase.from("report_feedback").insert({
      lead_id: leadId,
      rating: value,
      role: role || null,
      zone: zone || null,
    });

    setSending(null);
    setSubmitted(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText("https://compcare.se/?utm_source=referral&utm_medium=clipboard&utm_campaign=report_share");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Tack! Dela gärna med en kollega som borde se sina siffror.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Kopierad!" : "Kopiera länk"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background border-border/60">
      <CardContent className="py-6 space-y-4">
        <p className="text-sm font-medium text-foreground text-center">
          Gillar du rapporten?
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Tumme upp"
            disabled={!!sending}
            onClick={() => handleSelect("yes")}
            className="flex items-center justify-center w-14 h-14 rounded-full border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Tumme ner"
            disabled={!!sending}
            onClick={() => handleSelect("no")}
            className="flex items-center justify-center w-14 h-14 rounded-full border border-border bg-background text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors disabled:opacity-50"
          >
            <ThumbsDown className="w-6 h-6" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
