import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Loader2, Download, Linkedin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ShareButton from "@/components/ShareButton";
import SocialProofBanner from "@/components/SocialProofBanner";
import { useCheckout } from "@/shared/useCheckout";
import type { ReportData } from "@/shared/types";

import PermanentTrackContent from "@/components/report/PermanentTrackContent";
import ConsultantTrackContent from "@/components/report/ConsultantTrackContent";
import ReportPreviewList from "@/shared/ReportPreviewList";
import CheckoutButtons from "@/shared/CheckoutButtons";

export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const { checkoutLoading, handleCheckout: checkout } = useCheckout();

  useEffect(() => {
    if (!reportId) { navigate("/"); return; }
    const fetchReport = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-report", {
          body: { report_id: reportId },
        });
        if (error || !data || data.error) { navigate("/"); return; }
        setReport(data as ReportData);
      } catch { navigate("/"); } finally { setLoading(false); }
    };
    fetchReport();
  }, [reportId, navigate]);

  const onCheckout = (plan: "single" | "yearly") => {
    if (!report) return;
    const leadId = sessionStorage.getItem("leadId") || "";
    checkout(plan, { email: report.email || "", leadId, reportId: report.id });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) return null;

  const r = report.result_json;
  const isPermanentTrack = r.track === "permanent";
  const isFullAccess = report.access === "full";
  const isEmployee = report.employment_type === "anstalld";

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient py-10 px-5 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
            {isFullAccess ? "Din personliga rapport" : "Förhandsgranskning"}
          </p>
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Löneanalys för {report.occupation}
          </h1>
          <p className="text-sm text-primary-foreground/80">
            {report.kommun} · {isPermanentTrack ? "Fast tjänst" : "Konsultuppdrag"}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
        {report.unlocked_by_referral && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent font-medium">
            <ShieldCheck className="w-4 h-4" />
            Upplåst via kollegatips
          </div>
        )}

        <SocialProofBanner occupation={report.occupation} />

        {isPermanentTrack ? (
          <PermanentTrackContent
            r={r}
            isFullAccess={isFullAccess}
            occupation={report.occupation}
            kommun={report.kommun}
          />
        ) : (
          <ConsultantTrackContent
            r={r}
            isFullAccess={isFullAccess}
            isEmployee={isEmployee}
            occupation={report.occupation}
            kommun={report.kommun}
            zoneComparisons={report.zone_comparisons}
            userZone={report.user_zone}
          />
        )}

        {/* Preview CTA */}
        {!isFullAccess && (
          <div className="space-y-4">
            <ReportPreviewList isPermanent={isPermanentTrack} />
            <CheckoutButtons checkoutLoading={checkoutLoading} onCheckout={onCheckout} layout="stacked" />
          </div>
        )}

        {/* Full access actions */}
        {isFullAccess && (
          <div className="flex flex-col gap-3">
            <ShareButton
              title="BraGig.se – Löneanalys"
              text={`Jag kollade min lön som ${report.occupation} med BraGig.se — rekommenderar det!`}
              className="w-full"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
                <Download className="w-4 h-4" /> PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  const url = window.location.href;
                  const text = `Jag har precis tagit reda på mitt verkliga löneutrymme som ${report.occupation} med BraGig.se — rekommenderar det!`;
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`,
                    "_blank", "width=600,height=500"
                  );
                }}
              >
                <Linkedin className="w-4 h-4" /> LinkedIn
              </Button>
            </div>
          </div>
        )}

        <Separator />
        <p className="text-xs text-muted-foreground text-center leading-relaxed pb-8">
          Denna rapport baseras på offentliga ramavtalspriser och är avsedd som vägledning.
          Faktisk lön kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
          <br />
          © {new Date().getFullYear()} BraGig.se
        </p>
      </main>
    </div>
  );
}
