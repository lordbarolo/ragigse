import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  leadId: string;
  email: string;
  role?: string;
  zone?: string;
}

export default function InvoiceReviewCTA({ leadId, email, role, zone }: Props) {
  const [checked, setChecked] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

  // Check if already opted in — use edge function or try insert with unique constraint
  useEffect(() => {
    // We can't SELECT due to RLS, so we track locally
    const key = `invoiceReview_${leadId}`;
    if (sessionStorage.getItem(key)) {
      setAlreadyOptedIn(true);
    }
  }, [leadId]);

  const handleSubmit = async () => {
    if (!checked || loading) return;
    setLoading(true);

    const { error } = await supabase.from("invoice_review_leads").insert({
      lead_id: leadId,
      email,
      role: role || null,
      zone: zone || null,
    });

    if (error) {
      // Unique constraint = already opted in
      if (error.code === "23505") {
        setAlreadyOptedIn(true);
        sessionStorage.setItem(`invoiceReview_${leadId}`, "1");
      } else {
        console.warn("[InvoiceReviewCTA]", error.message);
      }
      setLoading(false);
      return;
    }

    sessionStorage.setItem(`invoiceReview_${leadId}`, "1");
    trackEvent("invoice_review_opted_in", { role: role || "", zone: zone || "" });
    setSubmitted(true);
    setLoading(false);
  };

  if (alreadyOptedIn || submitted) {
    return (
      <div className="space-y-0">
        <Separator />
        <div className="rounded-lg border border-border bg-card p-5 my-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Tack! Vi hör av oss inom 5 arbetsdagar.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vi granskar dina fakturor och tidrapporter kostnadsfritt.</p>
            </div>
          </div>
        </div>
        <Separator />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <Separator />
      <div className="rounded-lg border border-border bg-card p-5 my-6 space-y-4">
        <div className="flex items-start gap-3">
          <FileSearch className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              Har du fått rätt betalt för alla dina timmar?
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Många konsulter missar ersättning för OB, jour och helg. Compcare granskar dina fakturor
              och tidrapporter utan kostnad — vi tar bara betalt om vi hittar pengar du missat.
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Kryssa i rutan så hör vi av oss till <span className="font-medium text-foreground">{email}</span>
        </p>

        <div className="flex items-start gap-2">
          <Checkbox
            id="invoice-review"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <label htmlFor="invoice-review" className="text-sm text-muted-foreground cursor-pointer leading-tight">
            Ja, kontakta mig för en kostnadsfri fakturagranskning
          </label>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!checked || loading}
          size="sm"
          className="w-full sm:w-auto"
        >
          {loading ? "Skickar..." : "Skicka"}
        </Button>
      </div>
      <Separator />
    </div>
  );
}
