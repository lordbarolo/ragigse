import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MapPin, Briefcase, Clock, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import ProfileInsights from "@/components/profile/ProfileInsights";
import TrustVerification from "@/components/profile/TrustVerification";
import CompensationView from "@/components/report/CompensationView";
import DashboardReferences from "@/components/profile/DashboardReferences";
import DashboardDocuments from "@/components/profile/DashboardDocuments";
import DashboardInvoiceCheck from "@/components/profile/DashboardInvoiceCheck";
import AssignmentFeedbackDialog from "@/components/profile/AssignmentFeedbackDialog";
import { useAssignmentFeedback } from "@/hooks/useAssignmentFeedback";
import { trackEvent } from "@/lib/trackEvent";

interface ReportRow {
  id: string;
  created_at: string;
  occupation: string | null;
  kommun: string | null;
  employment_type: string | null;
  status: string;
}

interface ProfileData {
  specialty_name: string | null;
  region_name: string | null;
  experience_years: number | null;
  employment_type: string | null;
  salary_type: string | null;
  current_hourly_rate: number | null;
  current_monthly_salary: number | null;
}

interface VerificationFlags {
  hasBankid: boolean;
  hasValidHosp: boolean;
  hasValidIvo: boolean;
}

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [verification, setVerification] = useState<VerificationFlags>({
    hasBankid: false,
    hasValidHosp: false,
    hasValidIvo: false,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const { pending: pendingFeedback, dismiss: dismissFeedback } = useAssignmentFeedback(user);

  useEffect(() => {
    if (pendingFeedback) {
      trackEvent("assignment_feedback_shown", { stage: pendingFeedback.stage });
    }
  }, [pendingFeedback?.representation_request_id, pendingFeedback?.stage]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/logga-in");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: reportData } = await supabase
        .from("reports")
        .select("id, created_at, occupation, kommun, employment_type, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setReports(reportData || []);

      const { data: cpData } = await supabase
        .from("consultant_profiles")
        .select("specialty_id, region_id, experience_years, employment_type, salary_type, current_hourly_rate, current_monthly_salary")
        .eq("user_id", user.id)
        .single();

      if (cpData) {
        let specialtyName: string | null = null;
        let regionName: string | null = null;
        if (cpData.specialty_id) {
          const { data: spec } = await supabase.from("specialties").select("name").eq("id", cpData.specialty_id).single();
          specialtyName = spec?.name || null;
        }
        if (cpData.region_id) {
          const { data: reg } = await supabase.from("regions").select("kommun").eq("id", cpData.region_id).single();
          regionName = reg?.kommun || null;
        }

        if (!specialtyName || !regionName) {
          const { data: latestReport } = await supabase
            .from("reports")
            .select("occupation, kommun")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestReport) {
            if (!specialtyName && latestReport.occupation) specialtyName = latestReport.occupation;
            if (!regionName && latestReport.kommun) regionName = latestReport.kommun;
          }
        }

        setProfile({
          specialty_name: specialtyName, region_name: regionName,
          experience_years: cpData.experience_years, employment_type: cpData.employment_type,
          salary_type: cpData.salary_type, current_hourly_rate: cpData.current_hourly_rate,
          current_monthly_salary: cpData.current_monthly_salary,
        });
      }

      const { data: profileFlags } = await supabase
        .from("profiles")
        .select("has_bankid, has_valid_hosp, has_valid_ivo")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileFlags) {
        setVerification({
          hasBankid: !!profileFlags.has_bankid,
          hasValidHosp: !!profileFlags.has_valid_hosp,
          hasValidIvo: !!profileFlags.has_valid_ivo,
        });
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/profil/${user.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success("Profillänk kopierad!"));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const employmentLabel = (t: string | null) => t === "consultant" ? "Konsult" : t === "permanent" ? "Tillsvidareanställd" : t || "–";
  const formatSalary = (val: number | null) => val ? val.toLocaleString("sv-SE") : "–";

  const emailVerified = !!user?.email_confirmed_at;
  const completenessChecks = [
    emailVerified,
    verification.hasBankid,
    verification.hasValidHosp,
    verification.hasValidIvo,
    !!profile?.specialty_name,
    !!profile?.region_name,
    !!(profile?.current_hourly_rate || profile?.current_monthly_salary),
  ];
  const completedCount = completenessChecks.filter(Boolean).length;
  const totalCount = completenessChecks.length;

  const displayName = user?.email?.split("@")[0]
    ?.split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ") || "Användare";

  return (
    <div className="relative min-h-screen bg-[#F2F1F8] overflow-hidden">

      <Navbar />

      <div className="relative pt-20 pb-12 px-4 max-w-5xl mx-auto space-y-5">
        {/* Hero */}
        <ProfileHero
          name={displayName}
          email={user?.email || ""}
          role={profile?.specialty_name}
          location={profile?.region_name}
          connections={0}
          completedCount={completedCount}
          totalCount={totalCount}
          onShare={handleShare}
        />

        {/* Tabs */}
        <ProfileTabs active={activeTab} onChange={setActiveTab} />

        {/* === OVERVIEW === */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-5">
              {/* About / Profile details */}
              {profile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Yrkesinformation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {profile.specialty_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-4 h-4" /> {profile.specialty_name}
                      </div>
                    )}
                    {profile.region_name && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" /> {profile.region_name}
                      </div>
                    )}
                    {profile.experience_years != null && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" /> {profile.experience_years} års erfarenhet
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="w-4 h-4" /> {employmentLabel(profile.employment_type)}
                      {profile.salary_type === "hourly" && profile.current_hourly_rate
                        ? ` · ${formatSalary(profile.current_hourly_rate)} kr/h`
                        : profile.current_monthly_salary
                          ? ` · ${formatSalary(profile.current_monthly_salary)} kr/mån`
                          : ""}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compensation view */}
              <CompensationView
                role={profile?.specialty_name || null}
                location={profile?.region_name || null}
                employmentType={profile?.employment_type || null}
              />

              {/* Insights */}
              <Card>
                <CardContent className="pt-6">
                  <ProfileInsights
                    specialtyName={profile?.specialty_name || null}
                    regionName={profile?.region_name || null}
                    employmentType={profile?.employment_type || null}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column (1/3) */}
            <div className="space-y-5">
              <TrustVerification
                emailVerified={emailVerified}
                identityVerified={verification.hasBankid}
                hospValid={verification.hasValidHosp}
                ivoValid={verification.hasValidIvo}
              />
              <DashboardInvoiceCheck />
            </div>
          </div>
        )}

        {/* === WORK === */}
        {activeTab === "work" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Mina rapporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm mb-3">Inga rapporter ännu</p>
                    <Link to="/">
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-1" />
                        Skapa din första analys
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.map((r) => (
                      <Link key={r.id} to={`/rapport/${r.id}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group">
                        <div>
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">{r.occupation || "Analys"}</p>
                          <p className="text-xs text-muted-foreground">{r.kommun && `${r.kommun} · `}{new Date(r.created_at).toLocaleDateString("sv-SE")}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">→</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <DashboardInvoiceCheck />
          </div>
        )}

        {/* === CREDS (verifications + documents + references) === */}
        {activeTab === "creds" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <TrustVerification
                emailVerified={emailVerified}
                identityVerified={verification.hasBankid}
                hospValid={verification.hasValidHosp}
                ivoValid={verification.hasValidIvo}
              />
              <DashboardDocuments />
            </div>
            <div className="space-y-5">
              <DashboardReferences />
            </div>
          </div>
        )}

        {/* === NETWORK === */}
        {activeTab === "network" && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Check className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nätverket lanseras snart</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Snart kan du koppla ihop dig med andra konsulter och referensgivare i ditt nätverk.
              </p>
            </CardContent>
          </Card>
        )}

        {/* === SAVED === */}
        {activeTab === "saved" && (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Inget sparat ännu</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Spara analyser, uppdrag och artiklar för att hitta dem snabbt här.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
