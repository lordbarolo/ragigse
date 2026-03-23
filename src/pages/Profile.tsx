import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileText, MapPin, Briefcase, Clock, LogOut, Shield } from "lucide-react";
import { ReferenceDashboard } from "@/components/referly/ReferenceDashboard";

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

export default function Profile() {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

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
        setProfile({
          specialty_name: specialtyName, region_name: regionName,
          experience_years: cpData.experience_years, employment_type: cpData.employment_type,
          salary_type: cpData.salary_type, current_hourly_rate: cpData.current_hourly_rate,
          current_monthly_salary: cpData.current_monthly_salary,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const employmentLabel = (t: string | null) => t === "consultant" ? "Konsult" : t === "permanent" ? "Tillsvidareanställd" : t || "–";
  const formatSalary = (val: number | null) => val ? val.toLocaleString("sv-SE") : "–";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-12 px-4 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Min profil</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground/60 font-mono select-all">ID: {user?.id}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logga ut
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Översikt
            </TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Referenser
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <ProfileDetailsCard profile={profile} employmentLabel={employmentLabel} formatSalary={formatSalary} />
            <ReportsCard reports={reports} />
            <div className="text-center">
              <Link to="/"><Button variant="outline" className="gap-2">Gör en ny analys</Button></Link>
            </div>
          </TabsContent>

          <TabsContent value="references" className="mt-4">
            <ReferenceDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProfileDetailsCard({ profile, employmentLabel, formatSalary }: { profile: ProfileData | null; employmentLabel: (t: string | null) => string; formatSalary: (v: number | null) => string }) {
  if (!profile) return null;
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader><CardTitle className="text-lg">Profiluppgifter</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4 text-primary" />
          <div><p className="text-xs text-muted-foreground">Yrke</p><p className="text-foreground font-medium">{profile.specialty_name || "–"}</p></div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 text-primary" />
          <div><p className="text-xs text-muted-foreground">Kommun</p><p className="text-foreground font-medium">{profile.region_name || "–"}</p></div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <div><p className="text-xs text-muted-foreground">Erfarenhet</p><p className="text-foreground font-medium">{profile.experience_years != null ? `${profile.experience_years} år` : "–"}</p></div>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="w-4 h-4 text-primary" />
          <div><p className="text-xs text-muted-foreground">Anställning</p><p className="text-foreground font-medium">{employmentLabel(profile.employment_type)}</p></div>
        </div>
        {profile.current_hourly_rate && (
          <div className="col-span-2"><p className="text-xs text-muted-foreground">{profile.employment_type === "foretagare" ? "Nuvarande timersättning" : "Nuvarande timlön"}</p><p className="text-foreground font-semibold text-lg">{formatSalary(profile.current_hourly_rate)} kr/h</p></div>
        )}
        {profile.current_monthly_salary && (
          <div className="col-span-2"><p className="text-xs text-muted-foreground">{profile.employment_type === "foretagare" ? "Nuvarande månadsersättning" : "Nuvarande månadslön"}</p><p className="text-foreground font-semibold text-lg">{formatSalary(profile.current_monthly_salary)} kr/mån</p></div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportsCard({ reports }: { reports: ReportRow[] }) {
  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader><CardTitle className="text-lg">Mina rapporter</CardTitle></CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Inga rapporter ännu</p>
            <Link to="/" className="text-primary hover:underline text-sm mt-2 inline-block">Gör din första analys →</Link>
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
  );
}
