import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { SurveyData } from "@/components/Survey";
import CompcareLogo from "@/components/CompcareLogo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import TeaserHeader from "@/components/teaser/TeaserHeader";
import EmailGate from "@/components/teaser/EmailGate";

/** Teaser page — clean email gate before showing the full report */
export default function Teaser() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const checkoutRef = useRef<HTMLDivElement>(null);
  const [couponDiscount, setCouponDiscount] = useState<{ discount_type: "percent" | "fixed" | "free"; discount_value: number } | null>(null);
  const couponRedeemed = useRef(false);

  useTimeOnPage("teaser", !!survey);

  // Load data
  useEffect(() => {
    const resolvedLeadId = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!resolvedLeadId) { navigate("/"); return; }
    setLeadId(resolvedLeadId);

    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      setSurvey(JSON.parse(raw) as SurveyData);
      setReportId(sessionStorage.getItem("reportId") || "");
      trackEvent("teaser_viewed");
      return;
    }

    const fetchLead = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-lead", {
          body: { lead_id: resolvedLeadId },
        });
        if (error || !data?.lead) { setLoadError(true); return; }

        const lead = data.lead;
        const surveyData: SurveyData = {
          email: lead.email,
          employmentType: lead.employment_type as "anstalld" | "foretagare",
          yrke: lead.yrke || "",
          kommun: lead.kommun || "",
          experience: lead.experience || 0,
          salaryType: (lead.salary_type as "hourly" | "monthly") || "hourly",
          currentSalary: lead.current_salary || 0,
        };
        setSurvey(surveyData);
        setReportId(data.report_id || "");
        sessionStorage.setItem("leadId", resolvedLeadId);
        sessionStorage.setItem("surveyData", JSON.stringify(surveyData));
        if (data.report_id) sessionStorage.setItem("reportId", data.report_id);
        trackEvent("teaser_viewed");
      } catch { setLoadError(true); }
    };
    fetchLead();
  }, [urlLeadId, navigate]);

  // Validate coupon
  useEffect(() => {
    const couponCode = searchParams.get("coupon") || sessionStorage.getItem("couponCode");
    if (!couponCode || couponRedeemed.current) return;
    couponRedeemed.current = true;
    const validate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("validate-coupon", {
          body: { code: couponCode },
        });
        if (error || !data?.valid) {
          toast({ title: data?.error || "Ogiltig kupongkod", variant: "destructive" });
          return;
        }
        setCouponDiscount({ discount_type: data.discount_type, discount_value: data.discount_value });
        toast({ title: "Kupong tillämpad!" });
      } catch {
        toast({ title: "Kunde inte verifiera kupongkoden", variant: "destructive" });
      }
    };
    validate();
  }, [searchParams]);

  const isFree = couponDiscount?.discount_type === "free" ||
    (couponDiscount?.discount_type === "percent" && couponDiscount.discount_value >= 100);

  const handleEmailSubmit = async (emailValue: string) => {
    setEmailSaving(true);
    try {
      const { error: saveErr } = await supabase.functions.invoke("auto-create-account", {
        body: { lead_id: leadId, report_id: reportId, email: emailValue },
      });
      if (saveErr) throw saveErr;

      setEmail(emailValue);
      if (survey) {
        sessionStorage.setItem("surveyData", JSON.stringify({ ...survey, email: emailValue }));
      }
      trackEvent("email_collected", { source: "teaser" });
    } catch {
      toast({ title: "Kunde inte spara e-post, försök igen", variant: "destructive" });
      setEmailSaving(false);
      return;
    }

    // Ensure reportId exists
    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const { data: rData, error: rErr } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId, email: emailValue, occupation: survey.yrke,
            employment_type: survey.employmentType, kommun: survey.kommun,
            current_salary: survey.currentSalary, salary_type: survey.salaryType,
            track: "consultant",
          },
        });
        if (!rErr && rData?.report_id) {
          activeReportId = rData.report_id;
          setReportId(activeReportId);
          sessionStorage.setItem("reportId", activeReportId);
        }
      } catch { /* fall through */ }
    }

    if (!activeReportId) {
      toast({ title: "Kunde inte skapa rapport, försök igen", variant: "destructive" });
      setEmailSaving(false);
      return;
    }

    setEmailSaving(false);
    trackEvent("email_collected", { source: "teaser_gate_completed" });
    navigate(`/rapport/${activeReportId}`);
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Vi kunde inte hitta din analys</h1>
        <p className="text-sm text-muted-foreground">Länken kan vara ogiltig eller ha gått ut.</p>
        <Button onClick={() => navigate("/")}>Gör en ny analys</Button>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-background">
      <TeaserHeader kommun={survey.kommun} />

      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-foreground">Din analys är redo</h1>
          <p className="text-sm text-muted-foreground">{survey.yrke} · {survey.kommun}</p>
        </div>

        <div ref={checkoutRef}>
          {!email ? (
            <div className="rounded-xl border border-border bg-card p-6 card-shadow">
              <EmailGate
                onEmailSubmit={handleEmailSubmit}
                loading={emailSaving}
                coupon={couponDiscount}
                isFree={isFree}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">Öppnar din rapport...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
