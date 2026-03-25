import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

type Rating = "yes" | "partial" | "no";

interface Props {
  leadId: string;
  role?: string;
  zone?: string;
}

export default function ReportFeedback({ leadId, role, zone }: Props) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [comment, setComment] = useState("");
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

  const handleRating = async (value: Rating) => {
    setRating(value);
    trackEvent("report_feedback", { rating: value, role: role || "", zone: zone || "" });

    if (value === "yes") {
      await supabase.from("report_feedback").insert({
        lead_id: leadId,
        rating: value,
        role: role || null,
        zone: zone || null,
      });
      setSubmitted(true);
    }
  };

  const handleCommentSubmit = async () => {
    if (!rating || comment.trim().length < 5) return;
    setSending(true);
    await supabase.from("report_feedback").insert({
      lead_id: leadId,
      rating,
      comment: comment.trim(),
      role: role || null,
      zone: zone || null,
    });
    trackEvent("report_feedback_comment", {
      rating,
      comment_length: comment.trim().length,
    });
    setSending(false);
    setSubmitted(true);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText("https://compcare.se/?utm_source=referral&utm_medium=clipboard&utm_campaign=report_share");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted && rating === "yes") {
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

  if (submitted) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-5 text-center">
          <p className="text-sm text-muted-foreground">Tack, det hjälper oss bli bättre 🙏</p>
        </CardContent>
      </Card>
    );
  }

  if (rating === "partial" || rating === "no") {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Tack för din feedback. Vad saknade du?
          </p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Berätta kort…"
            rows={3}
            maxLength={500}
            className="resize-none text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{comment.length}/500</span>
            <Button
              size="sm"
              disabled={comment.trim().length < 5 || sending}
              onClick={handleCommentSubmit}
            >
              {sending ? "Skickar…" : "Skicka"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="py-6 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Motsvarar rapporten dina förväntningar?
          </p>
        </div>
        <div className="flex justify-center gap-3">
          {([
            { value: "yes" as Rating, label: "Ja" },
            { value: "partial" as Rating, label: "Delvis" },
            { value: "no" as Rating, label: "Nej" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRating(opt.value)}
              className="px-5 py-2 rounded-full border border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
