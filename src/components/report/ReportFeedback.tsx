import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, PiggyBank, FileText, Sparkles, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type Value = "negotiation" | "pension" | "salary_report" | "chat";

interface Props {
  leadId: string;
  role?: string;
  zone?: string;
}

const options: { value: Value; label: string; icon: React.ReactNode }[] = [
  { value: "negotiation", label: "Förhandlingstips", icon: <MessageCircle className="w-5 h-5" /> },
  { value: "pension", label: "Pensionssimulatorn", icon: <PiggyBank className="w-5 h-5" /> },
  { value: "salary_report", label: "Lönerapporten", icon: <FileText className="w-5 h-5" /> },
  { value: "chat", label: "Chattfunktionen", icon: <Sparkles className="w-5 h-5" /> },
];

export default function ReportFeedback({ leadId, role, zone }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [alreadyFeedback, setAlreadyFeedback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

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
    setSending(true);
    trackEvent("report_feedback", { value, role: role || "", zone: zone || "" });

    await supabase.from("report_feedback").insert({
      lead_id: leadId,
      rating: value,
      role: role || null,
      zone: zone || null,
    });

    setSending(false);
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
        <p className="text-xs sm:text-sm font-medium text-foreground text-center whitespace-nowrap">
          Vilken del av rapporten var mest värdefull för dig?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {options.map((opt) => (
            <button
              key={opt.value}
              disabled={sending}
              onClick={() => handleSelect(opt.value)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {opt.icon}
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
