import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  reportId: string;
  email: string;
}

export default function AuditOptInForm({ reportId, email }: Props) {
  const [wantsAudit, setWantsAudit] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = wantsAudit && confirmedEmail && !submitting && !submitted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("audit_optins").insert([
        { report_id: reportId, email },
      ]);
      if (!error) {
        setSubmitted(true);
        trackEvent("report_section_viewed", { section: "audit_optin_submitted" });
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
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
            id="audit-optin"
            checked={wantsAudit}
            onCheckedChange={(v) => setWantsAudit(v === true)}
            className="mt-0.5"
          />
          <label htmlFor="audit-optin" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Har du fått fel ersättning senaste åren? Compcare erbjuder kostnadsfri analys av dina fakturor
            och tidrapporter — upptäcker vi fel kan du få ersättning för upp till 24 månader bakåt i tiden.
            Vill du att vi säkerställer att du fått betalt för alla timmar du jobbat?{" "}
            <span className="font-medium text-foreground">Klicka ja så kontaktar vi dig via mail.</span>
          </label>
        </div>

        {wantsAudit && (
          <div className="flex items-start gap-3 pl-0.5">
            <Checkbox
              id="confirm-email"
              checked={confirmedEmail}
              onCheckedChange={(v) => setConfirmedEmail(v === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-email" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              Jag bekräftar att min e-postadress är{" "}
              <span className="font-medium text-foreground">{email}</span>
            </label>
          </div>
        )}

        {wantsAudit && confirmedEmail && (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Ja, kontakta mig
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
