import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, Linkedin } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { getCouponCode } from "@/lib/captureParams";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";

import ShareButton from "@/components/ShareButton";
import type { ReportData } from "@/shared/types";

import ConsultantTrackContent from "@/components/report/ConsultantTrackContent";



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

        const { data, error } = await supabase.functions.invoke("get-report", {
          body: { report_id: reportId },
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
  const isEmployee = report.employment_type === "anstalld";
  const isFriendCoupon = getCouponCode()?.toLowerCase() === "vänner500";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Header — premium, mobile-first */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-20 pb-10 sm:pt-24 sm:pb-12">
        {/* Subtle decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          {/* Logo removed — already shown in Navbar */}
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-70">
            Ersättningsanalys
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight drop-shadow-sm">
            {report.occupation}
          </h1>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span>{report.kommun}{report.user_zone ? ` (${report.user_zone})` : ""}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>Konsultuppdrag</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>{isEmployee ? "Anställd" : "Eget bolag"}</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">

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




        {/* Utility actions */}
        <div className="flex gap-3 pt-2">
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
