import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import type { SurveyData } from "@/components/Survey";
import type { PricingResult } from "@/hooks/usePricingEngine";
import { Check, Mail, ArrowRight, Info } from "lucide-react";
import { CONSULTANT_ITEMS, PERMANENT_ITEMS } from "@/components/teaser/ReportPreviewList";
import { fetchLead, leadToSurvey, createReport, saveEmail } from "@/services/leadService";
import Navbar from "@/components/Navbar";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("sv-SE");
}

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

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
      const pricingRaw = sessionStorage.getItem("pricingResult");
      if (pricingRaw) {
        try {
          setPricing(JSON.parse(pricingRaw) as PricingResult);
        } catch {
          sessionStorage.clear();
          navigate("/");
          return;
        }
      }
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

  /* ── Derived teaser data ── */
  const teaserData = useMemo(() => {
    if (!survey || !pricing) return null;
    if (!survey.currentSalary || survey.currentSalary <= 0) return null;
    const userHourly = survey.salaryType === "hourly" ? survey.currentSalary : Math.round(survey.currentSalary / 167);
    if (!pricing.rate_customer_sek_per_hour ||
        !pricing.recommended_hourly_min ||
        !pricing.recommended_hourly_max) return null;
    const customerRate = pricing.rate_customer_sek_per_hour;
    const low = pricing.recommended_hourly_min;
    const high = pricing.recommended_hourly_max;
    const isUnderpaid = userHourly < low;
    const isInRange = userHourly >= low && userHourly < high;
    const isAboveCustomerRate = userHourly > customerRate;
    const roleName = survey.yrke || "Sjuksköterska";
    const zone = pricing.zon || "Zon 1";
    const diffPercent = isUnderpaid ?
      Math.round((high - userHourly) / high * 100) :
      Math.round((userHourly - low) / low * 100);
    const isPermanent = (survey as SurveyData & { track?: string }).track === "permanent";
    return { userHourly, customerRate, low, high, isUnderpaid, isInRange, isAboveCustomerRate, roleName, zone, diffPercent, isPermanent };
  }, [survey, pricing]);

  const validEmail = EMAIL_REGEX.test(email.trim());

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="px-4 py-8 pt-20 pb-20 max-w-lg mx-auto space-y-6">

        {/* ── Price comparison card — TOP ── */}
        {teaserData && (
          <div className="bg-card border border-primary/20 rounded-[14px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-indigo-500/60" />

            <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/[0.06]">
              <span className="text-[11px] text-foreground/45 font-display font-medium tracking-[0.1em]">
                {teaserData.roleName} · {teaserData.zone}
              </span>
              {teaserData.isUnderpaid ? (
                <span className="bg-[hsl(var(--amber))]/[0.12] text-[hsl(var(--amber))] border border-[hsl(var(--amber))]/25 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                  Under marknad
                </span>
              ) : teaserData.isInRange ? (
                <span className="bg-foreground/[0.08] text-foreground/60 border border-foreground/15 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                  Inom marknadsspann
                </span>
              ) : teaserData.isAboveCustomerRate ? (
                <span className="bg-[hsl(var(--amber))]/[0.12] text-[hsl(var(--amber))] border border-[hsl(var(--amber))]/25 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                  Över kundpris
                </span>
              ) : (
                <span className="bg-[hsl(var(--green))]/[0.12] text-[hsl(var(--green))] border border-[hsl(var(--green))]/25 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                  Över marknad
                </span>
              )}
            </div>

            <div className="px-5 py-1">
              {[
                { dot: "hsl(var(--primary))", label: "Regionens kundpris", val: `${fmt(teaserData.customerRate)} kr/h` },
                { dot: teaserData.isUnderpaid ? "hsl(var(--amber))" : teaserData.isInRange ? "hsl(var(--foreground) / 0.4)" : "hsl(var(--green))", label: "Din ersättning", val: `${fmt(teaserData.userHourly)} kr/h` },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-foreground/[0.04] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: m.dot }} />
                    <span className="text-[14px] text-foreground/75">{m.label}</span>
                  </div>
                  <span className="font-display text-[17px] font-extrabold text-foreground">{m.val}</span>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4 pt-1">
              <p className="text-[13px] text-foreground/55 leading-relaxed">
                {teaserData.isAboveCustomerRate ? (
                  <>
                    Din ersättning på {fmt(teaserData.userHourly)} kr/h ligger{" "}
                    <strong className="text-[hsl(var(--amber))]">över regionens kundpris</strong>{" "}
                    på {fmt(teaserData.customerRate)} kr/h. Se rapporten för fullständig analys.
                  </>
                ) : teaserData.userHourly > teaserData.high ? (
                  <>
                    Din ersättning ligger{" "}
                    <strong className="text-[hsl(var(--green))]">över marknadsspannet</strong>{" "}
                    för {survey?.yrke || "din roll"}.
                  </>
                ) : teaserData.userHourly < teaserData.low ? (
                  <>
                    Marknadsspannet för {survey?.yrke || "din roll"} är{" "}
                    <strong className="text-[hsl(var(--amber))]">högre</strong>{" "}
                    än din nuvarande ersättning.
                  </>
                ) : (
                  <>
                    Din ersättning ligger{" "}
                    <strong className="text-foreground/75">inom marknadsspannet</strong>{" "}
                    för {survey?.yrke || "din roll"}.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Heading + report contents ── */}
        <div>
          <h2 className="font-display text-[20px] font-extrabold tracking-tight text-foreground mb-3">
            Rapporten är klar — vart skickar vi den?
          </h2>
          <div className="space-y-2.5">
            {(teaserData?.isPermanent ? PERMANENT_ITEMS : CONSULTANT_ITEMS).map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-foreground leading-tight">{title}</p>
                  {desc && <p className="text-[13px] text-foreground/55 mt-0.5">{desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Email explanation ── */}
        <p className="text-[13px] text-foreground/50 leading-relaxed">
          Vi skickar hela rapporten till din mail så att du kan spara och jämföra senare. Dela den gärna till kollegor.
        </p>

        {/* ── Email input + button ── */}
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

        {/* ── Bottom preview card ── */}
        {teaserData && (
          <div className="bg-card border border-foreground/[0.08] rounded-[14px] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-primary/30" />
            <div className="px-5 py-1">
              {[
                { dot: "hsl(var(--primary))", label: "Regionens kundpris", val: `${fmt(teaserData.customerRate)} kr/h` },
                { dot: teaserData.isUnderpaid ? "hsl(var(--amber))" : "hsl(var(--green))", label: "Din ersättning", val: `${fmt(teaserData.userHourly)} kr/h` },
                { dot: "hsl(var(--foreground) / 0.3)", label: "Skillnad", val: `${fmt(Math.abs(teaserData.customerRate - teaserData.userHourly))} kr/h` },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-foreground/[0.04] last:border-b-0">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: m.dot }} />
                    <span className="text-[14px] text-foreground/75">{m.label}</span>
                  </div>
                  <span className="font-display text-[17px] font-extrabold text-foreground">{m.val}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-4 pt-1">
              <p className="text-[13px] text-foreground/45 leading-relaxed">
                Beloppen säger inte allt. Se rapporten för utförlig analys.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
