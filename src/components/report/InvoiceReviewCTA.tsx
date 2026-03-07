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
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

  useEffect(() => {
    const key = `invoiceReview_${leadId}`;
    if (sessionStorage.getItem(key)) {
      setAlreadyOptedIn(true);
    }
  }, [leadId]);

  const canSubmit = wantsReview && confirmedEmail && !loading && !submitted;

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
      await supabase.from("audit_optins").insert({ report_id: reportId, email }).catch(() => {});
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
          <p className="font-semibold text-foreground text-sm">Kostnadsfri fakturaanalys</p>
        </div>

        <div className="flex items-start gap-3">
          <Checkbox
            id="invoice-review"
            checked={wantsReview}
            onCheckedChange={(v) => setWantsReview(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="invoice-review" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Har du fått fel ersättning senaste åren? Compcare erbjuder kostnadsfri analys av dina fakturor
            och tidrapporter — upptäcker vi fel kan du få ersättning för upp till 24 månader bakåt i tiden.
            Vill du att vi säkerställer att du fått betalt för alla timmar du jobbat?{" "}
            <span className="font-medium text-foreground">Klicka ja så kontaktar vi dig via mail.</span>
          </label>
        </div>

        {wantsReview && (
          <div className="flex items-start gap-3 pl-0.5">
            <Checkbox
              id="confirm-email-review"
              checked={confirmedEmail}
              onCheckedChange={(v) => setConfirmedEmail(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-email-review" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              Jag bekräftar att min e-postadress är{" "}
              <span className="font-medium text-foreground">{email}</span>
            </label>
          </div>
        )}

        {wantsReview && confirmedEmail && (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Ja, kontakta mig
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
