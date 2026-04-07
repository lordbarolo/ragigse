import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import type { SurveyData } from "@/components/Survey";
import { Mail, ArrowRight, MapPin, TrendingUp } from "lucide-react";
import { fetchLead, leadToSurvey, createReport, saveEmail } from "@/services/leadService";
import Navbar from "@/components/Navbar";

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
  }, [urlLeadId, navigate]);

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

  /* ── Auto-submit for logged-in users ── */
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (survey && EMAIL_REGEX.test(email.trim()) && !autoSubmitted.current && !emailSaving) {
      autoSubmitted.current = true;
      handleEmailSubmit();
    }
  }, [survey, email]);

  /* ── Sort zones: user's zone first ── */
  const sortedZones = useMemo(() => {
    if (!zoneRates.length) return [];
    const userFirst = zoneRates.filter((r) => r.zon === userZone);
    const rest = zoneRates.filter((r) => r.zon !== userZone);
    return [...userFirst, ...rest];
  }, [zoneRates, userZone]);

  const validEmail = EMAIL_REGEX.test(email.trim());

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-4 py-8 pt-20 pb-20 max-w-lg mx-auto space-y-6">

        {/* ── Header ── */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-display font-semibold mb-1">
            Ramavtalspriser
          </p>
          <h1 className="font-display text-[22px] sm:text-[26px] font-extrabold tracking-tight text-foreground leading-tight">
            Regionens pris till bemanningsföretag
          </h1>
          <p className="text-[14px] text-foreground/55 mt-2 leading-relaxed">
            Så här ser ramavtalspriserna ut för <strong className="text-foreground/80">{survey.yrke}</strong> i de olika zonerna.
          </p>
        </div>

        {/* ── Zone price cards ── */}
        {loadingRates ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedZones.length > 0 ? (
          <div className="space-y-3">
            {sortedZones.map((rate, i) => {
              const isUserZone = rate.zon === userZone;
              return (
                <div
                  key={rate.zon}
                  className={`relative rounded-[14px] border p-5 transition-all ${
                    isUserZone
                      ? "bg-primary/[0.04] border-primary/30 shadow-[0_0_20px_rgba(0,194,255,0.06)]"
                      : "bg-card border-foreground/[0.08]"
                  }`}
                >
                  {/* User zone indicator */}
                  {isUserZone && (
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-primary/40 rounded-t-[14px]" />
                  )}

                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[15px] font-display font-bold ${isUserZone ? "text-primary" : "text-foreground"}`}>
                          {rate.zon}
                        </span>
                        <span className="text-[12px] text-foreground/45 font-medium">
                          {ZON_LABELS[rate.zon] || ""}
                        </span>
                      </div>

                      {isUserZone && survey.kommun && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-primary/70" />
                          <span className="text-[13px] text-foreground/60">
                            {survey.kommun}
                            {userRegion && <span className="text-foreground/40"> · {userRegion}</span>}
                          </span>
                        </div>
                      )}

                      {isUserZone && (
                        <span className="inline-block mt-2 text-[11px] font-display font-semibold text-primary bg-primary/[0.08] border border-primary/20 rounded-full px-2.5 py-0.5">
                          Din zon
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <p className={`font-display text-[28px] font-extrabold tracking-tight ${isUserZone ? "text-primary" : "text-foreground"}`}>
                        {fmt(rate.timpris_kund)}
                      </p>
                      <p className="text-[12px] text-foreground/45 font-medium">kr/h</p>
                    </div>
                  </div>

                  {rate.detaljer && (
                    <p className="text-[12px] text-foreground/40 mt-2 leading-relaxed">
                      {rate.detaljer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[14px] text-foreground/50">
              Inga priser hittades för {survey.yrke}.
            </p>
          </div>
        )}

        {/* ── Insight ── */}
        {sortedZones.length >= 2 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-foreground/[0.03] border border-foreground/[0.06]">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[13px] text-foreground/60 leading-relaxed">
              Prisskillnaden mellan zonerna speglar tillgång och efterfrågan. Glesbygd har normalt högre priser för att kompensera för reseavstånd.
            </p>
          </div>
        )}

        {/* ── CTA section ── */}
        <div className="space-y-4 pt-2">
          <div>
            <h2 className="font-display text-[18px] font-extrabold tracking-tight text-foreground mb-1">
              Se vad du borde tjäna
            </h2>
            <p className="text-[13px] text-foreground/50 leading-relaxed">
              I rapporten beräknar vi ditt förhandlingsspann baserat på kundpriset ovan. Vi skickar den till din e-post.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
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
                className="w-full bg-background/60 border-[1.5px] border-foreground/[0.12] rounded-xl text-foreground font-body text-[16px] py-4 pl-11 pr-4 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,194,255,0.1)] placeholder:text-foreground/35"
                autoFocus
              />
            </div>
            <button
              disabled={!validEmail || emailSaving}
              onClick={handleEmailSubmit}
              className={`w-full font-display font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                validEmail && !emailSaving
                  ? "bg-primary text-primary-foreground shadow-[0_0_28px_rgba(0,194,255,0.25)] hover:-translate-y-px hover:shadow-[0_0_40px_rgba(0,194,255,0.38)]"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {emailSaving ? "Skickar…" : "Visa min rapport"}
              {!emailSaving && <ArrowRight className="w-5 h-5" />}
            </button>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {["Visas direkt", "Ingen inloggning"].map((t) => (
                <span key={t} className="text-[13px] text-foreground/45 flex items-center gap-1 font-display font-medium">
                  <span className="text-[hsl(var(--green))] text-[12px] font-bold">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
