import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  leadId: string;
  email: string;
  role?: string;
  zone?: string;
  reportId?: string;
}

export default function InvoiceReviewCTA({ leadId, email, role, zone, reportId }: Props) {
  const [wantsReview, setWantsReview] = useState(false);
  // confirmedEmail no longer needed — single opt-in checkbox
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

  useEffect(() => {
    const key = `invoiceReview_${leadId}`;
    if (sessionStorage.getItem(key)) {
      setAlreadyOptedIn(true);
    }
  }, [leadId]);

  const canSubmit = wantsReview && !loading && !submitted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    // Insert into invoice_review_leads
    const { error } = await supabase.from("invoice_review_leads").insert({
      lead_id: leadId,
      email,
      role: role || null,
      zone: zone || null,
    });

    if (error) {
      if (error.code === "23505") {
        setAlreadyOptedIn(true);
        sessionStorage.setItem(`invoiceReview_${leadId}`, "1");
      } else {
        console.warn("[InvoiceReviewCTA]", error.message);
      }
      setLoading(false);
      return;
    }

    // Also insert into audit_optins for backward compat
    if (reportId) {
      await supabase.from("audit_optins").insert({ report_id: reportId, email }).then(() => {});
      supabase.functions.invoke("send-audit-confirmation", { body: { email } }).catch(() => {});
    }

    sessionStorage.setItem(`invoiceReview_${leadId}`, "1");
    trackEvent("invoice_review_opted_in", { role: role || "", zone: zone || "" });
    setSubmitted(true);
    setLoading(false);
  };

  if (alreadyOptedIn || submitted) {
    return (
      <Card className="card-shadow border-primary/20">
        <CardContent className="py-6 flex items-center gap-3 justify-center">
          <CheckCircle className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Tack! Vi återkommer till dig via e-post.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
          <p className="font-semibold text-foreground text-sm">Har du fått rätt betalt för alla dina timmar?</p>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          Många konsulter missar ersättning för OB, jour och helg. Compcare granskar dina fakturor och tidrapporter utan kostnad
          — vi tar bara betalt om vi hittar pengar du missat. Kryssa i rutan så hör vi av oss till{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>

        <div className="flex items-start gap-3">
          <Checkbox
            id="invoice-review"
            checked={wantsReview}
            onCheckedChange={(v) => setWantsReview(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="invoice-review" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Ja, kontakta mig för en kostnadsfri fakturagranskning
          </label>
        </div>

        {wantsReview && (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Ja, kontakta mig
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
