import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import type { SurveyData } from "@/components/Survey";
import { Mail, ArrowRight, Zap, ChevronUp } from "lucide-react";
import NegotiationAssistantTeaser from "@/components/teaser/NegotiationAssistantTeaser";
import { fetchLead, leadToSurvey, createReport, saveEmail } from "@/services/leadService";
import Navbar from "@/components/Navbar";
import CompcareLogo from "@/components/CompcareLogo";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fmt = (n: number) => n.toLocaleString("sv-SE");

const ZON_LABELS: Record<string, string> = {
  "Zon 1": "Storstad",
  "Zon 2": "Mellanstor stad",
  "Zon 3": "Glesbygd",
};

interface ZoneRate {
  zon: string;
  timpris_kund: number;
  detaljer: string | null;
}

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [userZone, setUserZone] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [zoneRates, setZoneRates] = useState<ZoneRate[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);

  /* ── Init: try sessionStorage, fallback to backend ── */
  useEffect(() => {
    const rid = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!rid) { navigate("/"); return; }
    setLeadId(rid);

    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      try {
        setSurvey(JSON.parse(raw) as SurveyData);
      } catch {
        sessionStorage.clear();
        navigate("/");
        return;
      }
      setReportId(sessionStorage.getItem("reportId") || "");
    } else {
      fetchLead(rid).then((res) => {
        const surveyData = leadToSurvey(res.lead);
        setSurvey(surveyData);
        if (res.report_id) {
          setReportId(res.report_id);
          sessionStorage.setItem("reportId", res.report_id);
        }
        sessionStorage.setItem("leadId", rid);
        sessionStorage.setItem("surveyData", JSON.stringify(surveyData));
      }).catch(() => {
        navigate("/");
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });
    trackEvent("analysis_started");
    trackEvent("product_page_viewed", { product: "loneanalys" });
    trackEvent("teaser_viewed");
    // Trigger PostHog /decide/ call to verify reverse proxy works end-to-end
    import("@/lib/posthog").then(({ default: posthog }) => {
      try {
        posthog.isFeatureEnabled?.("teaser-proxy-probe");
      } catch {
        // noop
      }
    });
  }, [urlLeadId, navigate]);

  // Force light cream background on html/body so dark theme doesn't bleed through
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

  /* ── Fetch zone + rates when survey is ready ── */
  useEffect(() => {
    if (!survey?.kommun || !survey?.yrke) return;

    const load = async () => {
      setLoadingRates(true);

      // 1. Look up user's zone from locations table
      const { data: locData } = await supabase
        .from("locations")
        .select("zon, region")
        .eq("kommun", survey.kommun)
        .limit(1);

      if (locData && locData.length > 0) {
        setUserZone(locData[0].zon);
        setUserRegion(locData[0].region);
      }

      // 2. Fetch rates for all zones for this role
      const { data: ratesData } = await supabase
        .from("rates")
        .select("zon, timpris_kund, detaljer")
        .eq("yrkeskategori", survey.yrke)
        .order("zon");

      if (ratesData) {
        setZoneRates(ratesData);
      }

      setLoadingRates(false);
    };
    load();
  }, [survey?.kommun, survey?.yrke]);

  /* ── Retry create report ── */
  const retryAttempted = useRef(false);
  useEffect(() => {
    if (!leadId || !survey || reportId || retryAttempted.current) return;
    retryAttempted.current = true;
    createReport({ leadId, survey, track: (survey as SurveyData & { track?: string }).track })
      .then(({ reportId: rid }) => {
        setReportId(rid);
        sessionStorage.setItem("reportId", rid);
      })
      .catch(() => {});
  }, [leadId, survey, reportId]);

  /* ── Email submit ── */
  const handleEmailSubmit = async () => {
    const emailValue = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailValue)) return;
    setEmailSaving(true);
    try {
      await saveEmail({ leadId, reportId, email: emailValue });
      if (survey) { sessionStorage.setItem("surveyData", JSON.stringify({ ...survey, email: emailValue })); }
      trackEvent("email_collected", { source: "analysis_screen" });
    } catch {
      toast.error("Kunde inte spara e-post, försök igen.");
      setEmailSaving(false);
      return;
    }

    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const result = await createReport({ leadId, email: emailValue, survey, track: "consultant" });
        activeReportId = result.reportId;
        setReportId(activeReportId);
        sessionStorage.setItem("reportId", activeReportId);
      } catch {}
    }
    if (!activeReportId) { toast.error("Kunde inte skapa rapport, försök igen."); setEmailSaving(false); return; }
    setEmailSaving(false);
    trackEvent("analysis_completed");
    trackEvent("free_report_unlocked", { source: "email_gate" });
    navigate(`/rapport/${activeReportId}`, { replace: true });
  };


  /* ── Sort zones: user's zone first ── */
  const sortedZones = useMemo(() => {
    if (!zoneRates.length) return [];
    const userFirst = zoneRates.filter((r) => r.zon === userZone);
    const rest = zoneRates.filter((r) => r.zon !== userZone);
    return [...userFirst, ...rest];
  }, [zoneRates, userZone]);

  /* ── Compensation comparison (teaser) ── */
  const userZoneRate = useMemo(
    () => zoneRates.find((r) => r.zon === userZone)?.timpris_kund ?? 0,
    [zoneRates, userZone]
  );

  const comparison = useMemo(() => {
    if (!survey || !userZoneRate) return null;
    const isEmployee = survey.employmentType === "anstalld";
    const role = (survey.yrke || "").toLowerCase();
    const isDoctor = role.includes("läkare") || role.includes("lakare");
    // SKR-marginalmodell: läkare 10–15% (konsultandel 85–90%), övriga 15–20% (80–85%)
    const shareMin = isDoctor ? 0.85 : 0.80;
    const shareMax = isDoctor ? 0.90 : 0.85;
    const employerFactor = 1.42;
    const marketRate = userZoneRate;

    // Rec range från ramavtal — alltid uttryckt i SAMMA storhet som "Din nuvarande ersättning":
    //  - företagare/konsult: kr/h fakturerat (= kundpris × andel)
    //  - anställd: nettolön kr/h (= kundpris × andel ÷ 1,42)  ← guard så vi aldrig
    //    visar lönekostnad bredvid nettolön (jfr bild 1 & 2 där 493–524 var fel skala).
    const scale = isEmployee ? employerFactor : 1;
    const recMin = Math.round((marketRate * shareMin) / scale);
    const recMax = Math.round((marketRate * shareMax) / scale);

    const isHourly = survey.salaryType === "hourly";
    const currentHourly = isHourly
      ? survey.currentSalary
      : (isEmployee ? Math.round(survey.currentSalary / 167) : survey.currentSalary);
    const currentMonthly = isHourly ? currentHourly * 167 : survey.currentSalary;
    const costToCompare = isEmployee ? Math.round(currentHourly * employerFactor) : currentHourly;
    return {
      isEmployee,
      currentHourly,
      currentMonthly,
      costToCompare,
      recMin,
      recMax,
      recMonthlyMin: recMin * 167,
      recMonthlyMax: recMax * 167,
      marketRate,
    };
  }, [survey, userZoneRate]);


  const validEmail = EMAIL_REGEX.test(email.trim());

  if (!survey) return null;

  const employmentLabel = survey.employmentType === "anstalld" ? "Anställd" : "Egenföretagare";
  const isDoctor = (survey.yrke || "").toLowerCase().includes("läkare");
  const marginText = isDoctor ? "10–15%" : "15–20%";
  const employerFactor = comparison?.isEmployee ? 1.42 : 1.0;
  const costPct = comparison && comparison.marketRate
    ? Math.min(100, Math.round((comparison.costToCompare / comparison.marketRate) * 100))
    : 0;

  return (
    <div
      className="min-h-screen"
      style={{
        // Cream light theme — override global dark tokens on this page only
        ['--background' as any]: '40 18% 91%',
        ['--foreground' as any]: '0 0% 4%',
        ['--card' as any]: '0 0% 100%',
        ['--card-foreground' as any]: '0 0% 4%',
        ['--popover' as any]: '0 0% 100%',
        ['--popover-foreground' as any]: '0 0% 4%',
        ['--muted' as any]: '40 18% 91%',
        ['--muted-foreground' as any]: '220 9% 46%',
        ['--secondary' as any]: '40 18% 91%',
        ['--secondary-foreground' as any]: '0 0% 4%',
        ['--accent' as any]: '40 18% 91%',
        ['--accent-foreground' as any]: '0 0% 4%',
        ['--border' as any]: '35 17% 85%',
        ['--input' as any]: '35 17% 85%',
        backgroundColor: '#EEEBE4',
        color: '#0A0A0A',
      }}
    >
      <Navbar />

      <main className="px-5 pt-20 pb-16 max-w-lg mx-auto">
        {/* ── Header ── */}
        <div className="mb-8">
          <CompcareLogo variant="full" className="!h-7 mb-3" />
          <p className="text-[13px] text-foreground/55 font-medium tracking-wide">
            Ersättningsanalys
          </p>
        </div>

        {/* ── Role + location ── */}
        <div className="mb-8 pb-6 border-b border-foreground/10">
          <h1 className="font-display text-[34px] sm:text-[38px] font-extrabold tracking-tight text-foreground leading-[1.05] mb-2">
            {(() => {
              const occ = survey.yrke || "";
              const stripped = occ.replace(/^Specialistläkare\s+/i, "").trim();
              if (!stripped) return occ;
              return stripped.charAt(0).toUpperCase() + stripped.slice(1);
            })()}
          </h1>
          <p className="text-[14px] text-[#6B6B6B]">
            {survey.kommun}{userRegion && <> · {userRegion}</>} · {employmentLabel}
          </p>
        </div>

        {loadingRates || !comparison ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-7">
            {/* Möjlig ersättning */}
            <div>
              <p className="text-[12px] text-[#6B6B6B] mb-1">Möjlig ersättning</p>
              <p className="font-display text-[32px] font-extrabold tracking-tight text-[hsl(var(--green))]">
                {fmt(comparison.recMin)}–{fmt(comparison.recMax)} <span className="text-[20px] font-bold">kr/h</span>
              </p>
              {(() => {
                const dMin = comparison.recMin - comparison.currentHourly;
                const dMax = comparison.recMax - comparison.currentHourly;
                if (dMin > 0) {
                  return (
                    <p className="text-[15px] font-semibold text-[hsl(var(--green))] mt-0.5 flex items-center gap-1">
                      <ChevronUp className="w-4 h-4 text-[hsl(var(--green))]" />
                      +{fmt(dMin)}–{fmt(dMax)} kr/h mer än du tjänar idag
                    </p>
                  );
                }
                return null;
              })()}
              <p className="text-[13px] text-[#6B6B6B] font-mono mt-1">
                {fmt(comparison.recMonthlyMin)}–{fmt(comparison.recMonthlyMax)} kr/mån
              </p>
            </div>

            {/* Din nuvarande ersättning */}
            <div>
              <p className="text-[12px] text-[#6B6B6B] mb-1">Din nuvarande ersättning</p>
              <p className="font-display text-[32px] font-extrabold tracking-tight text-foreground">
                {fmt(comparison.currentHourly)} <span className="text-[20px] font-bold">kr/h</span>
              </p>
            </div>

            {/* Ramavtalspris */}
            <div>
              <p className="text-[12px] text-foreground/55 mb-1">Ramavtalspris (kundpris)</p>
              <p className="font-display text-[32px] font-extrabold tracking-tight text-foreground">
                {fmt(comparison.marketRate)} <span className="text-[20px] font-bold">kr/h</span>
              </p>
              <p className="text-[12px] font-normal text-foreground/45 mt-1">
                Det här är vad regionen betalar bemanningsbolaget.
              </p>
            </div>


            {/* Beräkningsantaganden */}
            <div className="pt-6 border-t border-foreground/10">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="calculations" className="border-b-0">
                  <AccordionTrigger className="text-[12px] text-foreground/55 font-semibold py-2 hover:no-underline">
                    Hur beräknas detta?
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1.5 text-[13px] text-foreground/50 leading-relaxed pl-4 pb-0">
                      <li>· Bemanningsbolagets marginal: {marginText}</li>
                      {comparison.isEmployee && <li>· Arbetsgivaravgifter: faktor {employerFactor}</li>}
                      <li>· Arbetsmånad: 167 timmar</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        )}

        <div className="mt-6">
          <NegotiationAssistantTeaser />
        </div>

        {/* ── Email gate (unlock full report) ── */}
        <div className="mt-10 pt-6 border-t border-foreground/10 space-y-3">
          <div>
            <h2 className="font-display text-[16px] font-bold tracking-tight text-foreground mb-1">
              Lås upp hela rapporten
            </h2>
            <p className="text-[13px] text-foreground/50 leading-relaxed">
              Förhandlingsspann, alla zoner, metod — plus AI-assistans för din nästa löneförhandling. Skickas till din e-post.
            </p>
          </div>
          <div className="relative flex items-center">
            <Mail className="absolute left-4 w-4 h-4 text-foreground/30 pointer-events-none" />
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="namn@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && validEmail && !emailSaving) handleEmailSubmit(); }}
              className="w-full bg-background/60 border-[1.5px] border-foreground/[0.12] rounded-xl text-foreground font-body text-[16px] py-3.5 pl-11 pr-4 outline-none transition-all focus:border-primary placeholder:text-foreground/35"
            />
          </div>
          {validEmail && !emailSaving && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
              <Zap className="w-3.5 h-3.5" />
              Kostnadsfritt — klart på 60 sekunder
            </div>
          )}

          <button
            disabled={!validEmail || emailSaving}
            onClick={handleEmailSubmit}
            className={`relative w-full font-display font-bold text-base py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#8155FF] via-[#9333ea] to-[#ec4899] text-white shadow-[0_10px_40px_-8px_rgba(129,85,255,0.6)] overflow-hidden ${
              validEmail && !emailSaving
                ? "hover:shadow-[0_16px_50px_-8px_rgba(236,72,153,0.6)] hover:-translate-y-0.5 active:scale-[0.98] animate-pulse-soft"
                : "opacity-70 cursor-not-allowed"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {emailSaving ? "Skickar…" : "Få din gratis rapport →"}
            </span>
            {validEmail && !emailSaving && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            )}
          </button>
          <p className="text-center text-[12px] text-foreground/45">
            Inga kort. Ingen spam. Klart på 60 sek.
          </p>
        </div>

      </main>
    </div>
  );
}
