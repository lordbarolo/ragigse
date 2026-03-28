import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MapPin, Briefcase, Clock, LogOut, UserPlus } from "lucide-react";

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
      <div className="pt-20 pb-12 px-4 max-w-2xl mx-auto space-y-5">
        {/* Header + StatusBadge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Min dashboard</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logga ut
          </Button>
        </div>

        {/* Referenser & verifikationer — dold tillsvidare */}

        {/* Profile details */}
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profil</CardTitle>
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

        {/* Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
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
      </div>

    </div>
  );
}
