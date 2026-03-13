import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, Linkedin } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { getCouponCode } from "@/lib/captureParams";
import CompcareLogo from "@/components/CompcareLogo";

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
      {/* Header — premium, mobile-first */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-8 pb-10 sm:pt-10 sm:pb-12">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <CompcareLogo variant="full" className="mb-6" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/40 font-medium">
            Ersättningsanalys
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground leading-tight tracking-tight">
            {report.occupation}
          </h1>
          <div className="flex items-center gap-2 text-sm text-primary-foreground/60">
            <span>{report.kommun}</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
            <span>{isPermanentTrack ? "Fast tjänst" : "Konsultuppdrag"}</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/30" />
            <span>{isEmployee ? "Anställd" : "Eget bolag"}</span>
          </div>
        </div>
      </header>
      <div className="bg-muted/60 border-b border-border px-5 py-2.5">
        <p className="text-[11px] text-muted-foreground text-center max-w-lg mx-auto leading-snug">
          Rapportens belopp avser villkor för regionernas nationella upphandling av hyrpersonal.
        </p>
      </div>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">

        {isPermanentTrack ? (
          <PermanentTrackContent
            r={r}
            isFullAccess={true}
            occupation={report.occupation}
            kommun={report.kommun}
          />
        ) : (
          <ConsultantTrackContent
            r={r}
            isFullAccess={true}
            isEmployee={isEmployee}
            occupation={report.occupation}
            kommun={report.kommun}
            zoneComparisons={report.zone_comparisons}
            userZone={report.user_zone}
            registerSectionRef={registerSectionRef}
            leadId={report.lead_id}
            email={report.email}
            reportId={report.id}
            priceHistory={report.price_history}
          />
        )}


        {/* Share actions */}
        <div className="space-y-3 pt-2">
          <ShareButton
            title="CompCare.se – Ersättningsanalys"
            text={`Hur stor är egentligen skillnaden mellan konsult och fast tjänst? Se din ersättning mot marknaden.`}
            url={`${window.location.origin}/dela?yrke=${encodeURIComponent(report.occupation || "")}`}
            className="w-full"
          />
          <div className="flex gap-3">
            {!isFriendCoupon && (
              <Button variant="outline" className="flex-1 gap-2 h-12 rounded-xl border-border/50 hover:border-border" onClick={async () => {
                try {
                  const { data, error } = await supabase.functions.invoke("generate-pdf", {
                    body: { report_id: report.id },
                  });
                  if (error || !data?.pdf_base64) {
                    window.print();
                    return;
                  }
                  const byteChars = atob(data.pdf_base64);
                  const byteArray = new Uint8Array(byteChars.length);
                  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
                  const blob = new Blob([byteArray], { type: "application/pdf" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = data.filename || "CompCare_Rapport.pdf";
                  a.click();
                  URL.revokeObjectURL(url);
                  trackEvent("pdf_downloaded", { report_id: report.id });
                } catch {
                  window.print();
                }
              }}>
                <Download className="w-4 h-4" /> PDF
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2 h-12 rounded-xl border-border/50 hover:border-border"
              onClick={() => {
                const shareUrl = `${window.location.origin}/dela?yrke=${encodeURIComponent(report.occupation || "")}`;
                const text = `Hur stor är egentligen skillnaden mellan konsult och fast tjänst? Se din ersättning mot marknaden.`;
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

        {/* Footer */}
        <div className="pt-4">
          <Separator className="mb-6 opacity-30" />
          <div className="text-center space-y-3 pb-8">
            <CompcareLogo variant="wordmark" className="mx-auto opacity-40 !h-5" />
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
              Denna rapport baseras på gällande avtal från SKR och är avsedd som vägledning.
              Faktisk ersättning kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              © {new Date().getFullYear()} CompCare.se
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
