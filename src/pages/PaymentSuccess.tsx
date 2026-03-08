import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, XCircle, ArrowRight, PartyPopper } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

const REDIRECT_SECONDS = 5;

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const [reportId, setReportId] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      return;
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error || !data?.verified) {
          setStatus("error");
          return;
        }

        setStatus("success");
        trackEvent("payment_verified", { session_id: sessionId || "" });

        // Track payment_completed with timing from paywall
        const paywallEnteredAt = sessionStorage.getItem("paywallEnteredAt");
        const timeFromPaywall = paywallEnteredAt ? Math.round((Date.now() - Number(paywallEnteredAt)) / 1000) : 0;
        trackEvent("payment_completed", {
          price: 49,
          coupon_applied: false,
          coupon_code: null,
          time_from_paywall_seconds: timeFromPaywall,
        });

        // Store IDs from verification response
        const resolvedReportId = data.report_id || sessionStorage.getItem("reportId");
        const resolvedLeadId = data.lead_id || sessionStorage.getItem("leadId");
        setReportId(resolvedReportId);
        setLeadId(resolvedLeadId);

        if (resolvedReportId) {
          sessionStorage.setItem("reportId", resolvedReportId);
        }
      } catch {
        setStatus("error");
      }
    };

    verify();
  }, [searchParams]);

  const getRedirectPath = () => {
    if (reportId) return `/rapport/${reportId}`;
    if (leadId) return `/resultat/${leadId}`;
    return "/";
  };

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== "success") return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(getRedirectPath());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, navigate, reportId, leadId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="card-shadow max-w-md w-full">
        <CardContent className="pt-10 pb-10 text-center space-y-5">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
              <h1 className="font-display text-2xl text-foreground">Verifierar betalning…</h1>
              <p className="text-sm text-muted-foreground">Vänta medan vi bekräftar din betalning.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
                <div className="relative bg-accent/10 rounded-full p-4">
                  <PartyPopper className="w-10 h-10 text-accent" />
                </div>
              </div>
              <h1 className="font-display text-2xl text-foreground">Tack för ditt köp!</h1>
              <p className="text-sm text-muted-foreground">
                Din rapport är nu upplåst och redo att visa.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-accent" />
                <span>Omdirigerar om {countdown} sekunder…</span>
              </div>
              <Button onClick={() => navigate(getRedirectPath())} className="w-full mt-2" size="lg">
                Visa din rapport nu
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 text-destructive mx-auto" />
              <h1 className="font-display text-2xl text-foreground">Något gick fel</h1>
              <p className="text-sm text-muted-foreground">
                Betalningen kunde inte verifieras. Kontakta oss på{" "}
                <a href="mailto:info@compcare.se" className="text-primary underline">info@compcare.se</a>{" "}
                om du har betalat.
              </p>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full mt-2">
                Tillbaka till startsidan
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
