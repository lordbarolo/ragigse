import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Loader2, Download, Linkedin } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { getCouponCode } from "@/lib/captureParams";
import logoDark from "@/assets/logo-dark.png";

import ShareButton from "@/components/ShareButton";
import type { ReportData } from "@/shared/types";

import PermanentTrackContent from "@/components/report/PermanentTrackContent";
import ConsultantTrackContent from "@/components/report/ConsultantTrackContent";

import ReportFeedback from "@/components/report/ReportFeedback";

export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const reportViewedRef = useRef(false);

  // Section tracking via IntersectionObserver
  const sectionTrackedRef = useRef<Set<string>>(new Set());
  const sectionObserverRef = useRef<IntersectionObserver | null>(null);

  const registerSectionRef = useCallback((section: string) => (el: HTMLDivElement | null) => {
    if (!el || !sectionObserverRef.current) return;
    el.dataset.section = section;
    sectionObserverRef.current.observe(el);
  }, []);

  useEffect(() => {
    sectionObserverRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = (entry.target as HTMLElement).dataset.section;
          if (section && !sectionTrackedRef.current.has(section)) {
            sectionTrackedRef.current.add(section);
            trackEvent("report_section_viewed", { section });
          }
        }
      });
    }, { threshold: 0.3 });
    return () => sectionObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!reportId) { navigate("/"); return; }
    const fetchReport = async () => {
      try {
        // Pass auth user id so get-report can grant full access to owner
        const { data: { session } } = await supabase.auth.getSession();
        const authUserId = session?.user?.id || null;

        const { data, error } = await supabase.functions.invoke("get-report", {
          body: { report_id: reportId, auth_user_id: authUserId },
        });
        if (error || !data || data.error) { setReport(null); }
        else { setReport(data as ReportData); }
      } catch { setReport(null); } finally { setLoading(false); }
    };
    fetchReport();
  }, [reportId, navigate]);

  // Track report_viewed once report loads
  useEffect(() => {
    if (report && !reportViewedRef.current) {
      reportViewedRef.current = true;
      trackEvent("report_viewed", { role: report.occupation || "", zone: report.kommun || "" });
    }
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Rapporten hittades inte</h1>
        <p className="text-sm text-muted-foreground">Kontrollera länken eller gå tillbaka till startsidan.</p>
        <Button onClick={() => navigate("/")}>Till startsidan</Button>
      </div>
    );
  }

  const r = report.result_json;
  const isPermanentTrack = r.track === "permanent";
  const isEmployee = report.employment_type === "anstalld";
  const isFriendCoupon = getCouponCode()?.toLowerCase() === "vänner500";

  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient py-10 px-5 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <img src={logoDark} alt="CompCare" className="h-8 sm:h-9 mx-auto mb-4" />
          <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
            Din personliga rapport
          </p>
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Ersättningsanalys
          </h1>
          <p className="text-base font-medium text-primary-foreground/90">
            {report.occupation} · {report.kommun}
          </p>
          <p className="text-sm text-primary-foreground/60">
            {isPermanentTrack ? "Fast tjänst" : "Konsultuppdrag"} · {isEmployee ? "Anställd" : "Eget bolag"}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-4">
        {report.unlocked_by_referral && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent font-medium">
            <ShieldCheck className="w-4 h-4" />
            Upplåst via kollegatips
          </div>
        )}

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
            registerSectionRef={registerSectionRef}
            leadId={report.lead_id}
            email={report.email}
            reportId={report.id}
          />
        )}

        {/* Feedback */}
        {report.lead_id && (
          <ReportFeedback
            leadId={report.lead_id}
            role={report.occupation}
            zone={report.user_zone}
          />
        )}

        {/* Full access actions */}
        {isFullAccess && (
          <div className="flex flex-col gap-3">
            <ShareButton
              title="CompCare.se – Ersättningsanalys"
              text={`Jag kollade min ersättning som ${report.occupation} med CompCare.se — rekommenderar det!`}
              url={window.location.origin}
              className="w-full"
            />
            <div className="flex gap-3">
              {!isFriendCoupon && (
                <Button variant="outline" className="flex-1 gap-2" onClick={() => window.print()}>
                  <Download className="w-4 h-4" /> PDF
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  const shareUrl = window.location.origin;
                  const word = report?.employment_type === "foretagare" ? "ersättningsutrymme" : "löneutrymme";
                  const text = `Jag har precis tagit reda på mitt verkliga ${word} som ${report.occupation} med CompCare.se — rekommenderar det!`;
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(text)}`,
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
          Denna rapport baseras på gällande avtal från SKR och är avsedd som vägledning.
          Faktisk ersättning kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
          <br />
          © {new Date().getFullYear()} CompCare.se
        </p>
      </main>
    </div>
  );
}
