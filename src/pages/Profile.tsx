import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, MapPin, Briefcase, Clock, UserPlus, Check, Mail, Users, User, Share2, Pencil } from "lucide-react";
import { ProfilePageSkeleton } from "@/components/ui/page-skeleton";
import { toast } from "sonner";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import ProfileInsights from "@/components/profile/ProfileInsights";
import TrustVerification from "@/components/profile/TrustVerification";
import CompensationView from "@/components/report/CompensationView";
import DashboardReferences from "@/components/profile/DashboardReferences";
import DashboardDocuments, { type DashboardDocumentsHandle } from "@/components/profile/DashboardDocuments";
import ProfileAuditLog from "@/components/profile/ProfileAuditLog";
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
  const docsRef = useRef<DashboardDocumentsHandle>(null);
  const { pending: pendingFeedback, dismiss: dismissFeedback } = useAssignmentFeedback(user);

  const goUpload = () => {
    setActiveTab("creds");
    setTimeout(() => docsRef.current?.openUpload(), 50);
  };
  const goVerifyIdentity = () => {
    toast.info("Digital signering är på väg", { description: "Vi öppnar identitetsverifiering inom kort." });
  };

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
    return <ProfilePageSkeleton />;
  }

  const employmentLabel = (t: string | null) => t === "consultant" ? "Konsult" : t === "permanent" ? "Tillsvidareanställd (vill bli konsult)" : t || "–";
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

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || (user?.email?.slice(0, 2).toUpperCase() ?? "U");

  return (
    <div className="profile-light relative min-h-screen bg-[#F7F5FB] overflow-hidden">
      {/* Scoped overrides: force all cards in profile to light theme */}
      <style>{`
        .profile-light [class*="rounded-2xl"][class*="bg-[hsl(260"],
        .profile-light .rounded-xl.bg-card,
        .profile-light [data-slot="card"] { }
      `}</style>
      <style>{`
        .profile-light .relative.rounded-2xl.border.bg-\\[hsl\\(260_40\\%_9\\%_\\/_0\\.5\\)\\] {
          background: #ffffff !important;
          border-color: rgb(226 232 240) !important;
          backdrop-filter: none !important;
          box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
          color: rgb(15 23 42) !important;
        }
        .profile-light .bg-card { background: #ffffff !important; }
        .profile-light .border-border { border-color: rgb(226 232 240) !important; }
        .profile-light .text-foreground { color: rgb(15 23 42) !important; }
        .profile-light .text-muted-foreground { color: rgb(100 116 139) !important; }
        .profile-light .bg-muted { background: rgb(241 245 249) !important; }
        .profile-light .bg-secondary\\/50 { background: rgb(248 250 252) !important; }
        .profile-light .hover\\:bg-secondary:hover { background: rgb(241 245 249) !important; }
        .profile-light .divide-border > * + * { border-color: rgb(226 232 240) !important; }
      `}</style>
      {/* Subtle glow gradients matching landing page section 2 */}
      <div
        className="absolute inset-x-0 top-0 h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(256 100% 67% / 0.08) 0%, transparent 65%), radial-gradient(ellipse 50% 35% at 90% 30%, hsl(330 90% 70% / 0.07) 0%, transparent 60%)",
        }}
      />

      <Navbar />

      <div className="relative pt-20 pb-12 px-4 max-w-5xl mx-auto space-y-5">
        {/* Top progression bar — replaces old Profilstatus */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm px-4 sm:px-5 py-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Profilstatus</p>
              <p className="text-sm text-slate-900 mt-0.5 truncate">
                {percent >= 100
                  ? "Din profil är komplett."
                  : `${completedCount} av ${totalCount} steg klara.`}
              </p>
            </div>
            <span className="text-2xl font-semibold text-slate-900 tabular-nums shrink-0">{percent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${percent}%`,
                background:
                  "linear-gradient(90deg, hsl(256 90% 60%) 0%, hsl(280 85% 65%) 50%, hsl(330 90% 70%) 100%)",
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profil" className="flex-1 sm:flex-initial">
              <Button size="sm" className="w-full sm:w-auto gap-1.5 h-9 text-sm font-semibold text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] shadow-sm hover:shadow-md transition-all">
                <Pencil className="w-3.5 h-3.5" />
                Redigera
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
              onClick={handleShare}
              aria-label="Dela profil"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* CTA: gör enkäten om den inte är gjord */}
        {reports.length === 0 && !profile?.specialty_name && (
          <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-pink-50 p-5 sm:p-6 shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-violet-700">
              Kom igång
            </p>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mt-1">
              Gör din löneanalys på 60 sekunder
            </h2>
            <p className="text-sm text-slate-600 mt-1 mb-4 max-w-xl">
              Svara på 6 korta frågor så jämför vi din ersättning mot SKR:s ramavtal och skapar din personliga rapport.
            </p>
            <Link to="/">
              <Button
                size="sm"
                className="text-sm font-semibold px-6 py-3 text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3]"
              >
                Starta enkäten
              </Button>
            </Link>
          </div>
        )}

        {/* Tabs */}
        <ProfileTabs active={activeTab} onChange={setActiveTab} />

        {/* === OVERVIEW === */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left column (2/3) */}
            <div className="lg:col-span-2 space-y-5">
              {/* Personliga uppgifter (header + identity merged) */}
              <Card className="bg-white border-slate-200 shadow-sm backdrop-blur-none">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-slate-900">
                    <User className="w-4 h-4 text-primary" />
                    Personliga uppgifter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Identity row: avatar + name + email */}
                  <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-base font-semibold text-primary">{initials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
                      <p className="text-xs text-slate-500 truncate inline-flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> {user?.email || "–"}
                      </p>
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Briefcase className="w-4 h-4" /> {profile?.specialty_name || "–"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" /> {profile?.region_name || "–"}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4" /> 0 kopplingar
                    </div>
                    {profile?.experience_years != null && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4" /> {profile.experience_years} års erfarenhet
                      </div>
                    )}
                    {profile && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4" /> {employmentLabel(profile.employment_type)}
                        {profile.salary_type === "hourly" && profile.current_hourly_rate
                          ? ` · ${formatSalary(profile.current_hourly_rate)} kr/h`
                          : profile.current_monthly_salary
                            ? ` · ${formatSalary(profile.current_monthly_salary)} kr/mån`
                            : ""}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compensation view */}
              <CompensationView
                role={profile?.specialty_name || null}
                location={profile?.region_name || null}
                employmentType={profile?.employment_type || null}
              />

              {/* Insights */}
              <Card className="bg-white border-slate-200 shadow-sm backdrop-blur-none">
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
                onUpload={goUpload}
                onVerifyIdentity={goVerifyIdentity}
              />
              <DashboardInvoiceCheck />
            </div>
          </div>
        )}

        {/* === WORK === */}
        {activeTab === "work" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="bg-white border-slate-200 shadow-sm backdrop-blur-none">
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
                onUpload={goUpload}
                onVerifyIdentity={goVerifyIdentity}
              />
              <DashboardDocuments ref={docsRef} />
              <ProfileAuditLog />
            </div>
            <div className="space-y-5">
              <DashboardReferences />
            </div>
          </div>
        )}

        {/* === NETWORK === */}
        {activeTab === "network" && (
          <Card className="bg-white border-slate-200 shadow-sm backdrop-blur-none">
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
          <Card className="bg-white border-slate-200 shadow-sm backdrop-blur-none">
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

      {pendingFeedback && (
        <AssignmentFeedbackDialog pending={pendingFeedback} onClose={dismissFeedback} />
      )}
    </div>
  );
}
