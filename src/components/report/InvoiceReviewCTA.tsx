import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, CheckCircle, Loader2, Clock, Moon, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadyOptedIn, setAlreadyOptedIn] = useState(false);

  useEffect(() => {
    const key = `invoiceReview_${leadId}`;
    if (sessionStorage.getItem(key)) {
      setAlreadyOptedIn(true);
    }
  }, [leadId]);

  const handleSubmit = async () => {
    if (loading || submitted) return;
    setLoading(true);

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

    if (reportId) {
      await supabase.from("audit_optins").insert({ report_id: reportId, email }).then(() => {});
      supabase.functions.invoke("send-audit-confirmation", { body: { email } }).catch(() => {});
    }

    sessionStorage.setItem(`invoiceReview_${leadId}`, "1");
    trackEvent("invoice_review_opted_in", { role: role || "", zone: zone || "" });
    setSubmitted(true);
    setLoading(false);
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E0DBD3',
    borderRadius: '12px',
  };

  if (alreadyOptedIn || submitted) {
    return (
      <Card className="card-shadow" style={cardStyle}>
        <CardContent className="py-6 flex items-center gap-3 justify-center" style={{ background: '#FFFFFF' }}>
          <CheckCircle className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Tack! Vi återkommer till dig via e-post.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow" style={cardStyle}>
      <CardContent className="pt-6 space-y-5" style={{ background: '#FFFFFF', borderRadius: '12px' }}>
        <div className="flex items-start gap-2">
          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="font-semibold text-foreground text-base">
            Vår analys av tidrapporter indikerar att vårdkonsulter missar tiotusentals kronor i årlig ersättning på grund av enkla räknefel. Är du säker på att du fakturerat rätt?
          </p>
        </div>



        <p className="font-semibold text-foreground text-sm">
          Vill du ha hjälp att säkerställa dina fakturor?
        </p>

        {/* Concrete examples of missed compensation */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Moon, label: "OB-tillägg" },
            { icon: Clock, label: "Jour & beredskap" },
            { icon: Calendar, label: "Helg & storhelg" },
            { icon: ShieldCheck, label: "Avtalsenliga tillägg" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 p-2.5 rounded-lg bg-foreground/[0.03]">
              <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-hint font-medium">{label}</span>
            </div>
          ))}
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full gap-2 whitespace-normal h-auto py-3 text-sm sm:text-base">
          {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
          <span>Ja, granska mina fakturor kostnadsfritt</span>
        </Button>

        <p className="text-micro text-center text-muted-foreground">
          Vi kontaktar dig via <span className="font-medium text-foreground">{email}</span>
        </p>
      </CardContent>
    </Card>
  );
}
