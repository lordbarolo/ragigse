import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Download, UserPlus, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/trackEvent";
import { getCouponCode } from "@/lib/captureParams";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";

import ShareButton from "@/components/ShareButton";
import type { ReportData } from "@/shared/types";

import ConsultantTrackContent from "@/components/report/ConsultantTrackContent";
import ReportFlowIndicator from "@/components/report/ReportFlowIndicator";
import PossibleCompensationInfo from "@/components/PossibleCompensationInfo";



export default function Report() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#EEEBE4';
    document.body.style.backgroundColor = '#EEEBE4';
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

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
    <div
      className="min-h-screen"
      style={{
        // Light "cream" report theme — overrides global tokens only on this page
        ['--background' as any]: '40 18% 91%',     // #EEEBE4
        ['--foreground' as any]: '0 0% 4%',         // #0A0A0A
        ['--card' as any]: '0 0% 100%',             // #FFFFFF
        ['--card-foreground' as any]: '0 0% 4%',
        ['--popover' as any]: '0 0% 100%',
        ['--popover-foreground' as any]: '0 0% 4%',
        ['--muted' as any]: '40 18% 91%',
        ['--muted-foreground' as any]: '220 9% 46%', // #6B7280
        ['--secondary' as any]: '40 18% 91%',
        ['--secondary-foreground' as any]: '0 0% 4%',
        ['--accent' as any]: '40 18% 91%',
        ['--accent-foreground' as any]: '0 0% 4%',
        ['--border' as any]: '35 17% 85%',          // #E0DBD3
        ['--input' as any]: '35 17% 85%',
        ['--radius' as any]: '12px',
        backgroundColor: '#EEEBE4',
        color: '#0A0A0A',
      }}
    >
      <Navbar />
      {/* Header — cream light theme */}
      <header
        className="relative overflow-hidden px-5 pt-20 pb-10 sm:pt-24 sm:pb-12"
        style={{ backgroundColor: '#EEEBE4', color: '#0A0A0A' }}
      >
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: '#6B7280' }}>
            Ersättningsanalys
          </p>
          <h1 className="leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#0A0A0A' }}>
            {(() => {
              const occ = report.occupation || "";
              const stripped = occ.replace(/^Specialistläkare\s+/i, "").trim();
              if (!stripped) return occ;
              return stripped.charAt(0).toUpperCase() + stripped.slice(1);
            })()}
          </h1>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1" style={{ fontSize: '13px', color: '#6B7280' }}>
            <span className="whitespace-nowrap">{report.kommun}</span>
            {report.user_zone && (
              <span
                className="whitespace-nowrap px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0DBD3', color: '#0A0A0A', fontSize: '13px' }}
              >
                {report.user_zone}
              </span>
            )}
            <span className="w-1 h-1 rounded-full mx-0.5" style={{ backgroundColor: '#3D3491' }} />
            <span className="whitespace-nowrap">Konsultuppdrag</span>
            <span className="w-1 h-1 rounded-full mx-0.5" style={{ backgroundColor: '#3D3491' }} />
            <span className="whitespace-nowrap">{isEmployee ? "Anställd" : "Eget bolag"}</span>
          </div>
        </div>
      </header>

      <ReportFlowIndicator
        steps={[
          { id: "flow-din-ersattning", label: "Din ersättning & möjlig ersättning" },
          { id: "flow-situation", label: "Vad det betyder för dig" },
          { id: "flow-stod", label: "Få stöd i din förhandling" },
          { id: "flow-regional", label: "Villkoren på andra orter" },
          { id: "flow-negotiation", label: "Din förhandlingspotential" },
          { id: "flow-fakturor", label: "Har du tagit betalt för allt?" },
          { id: "flow-market", label: "Marknadsintelligens" },
          { id: "flow-method", label: "Beräkningsmetod" },
        ]}
      />

      <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">

        {/* Förklaring: möjlig ersättning */}
        <PossibleCompensationInfo variant="report" />

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





        {/* Skapa konto-CTA (visas endast för icke-inloggade) */}
        {!user && (
          <div className="rounded-2xl border p-5 mt-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E0DBD3' }}>
            <h3 className="font-semibold mb-1" style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#0A0A0A' }}>
              Spara din rapport
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
              Skapa ett konto för att spara analysen, följa marknaden och få tillgång till dina verktyg.
            </p>
            <Button
              onClick={() => navigate("/registrera")}
              className="text-sm font-semibold px-6 py-3 gap-2"
              style={{ backgroundColor: '#3D3491', color: '#FFFFFF' }}
            >
              <UserPlus className="w-4 h-4" />
              Skapa konto
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

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
