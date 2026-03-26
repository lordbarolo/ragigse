import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRefProfile } from "@/hooks/useRefProfile";
import { useActionItems } from "@/hooks/useActionItems";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, FileText, MapPin, Briefcase, Clock, LogOut, UserPlus, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { ProfileStatusCard } from "@/components/referly/ProfileStatusCard";
import { ReferenceVault } from "@/components/referly/ReferenceVault";
import { InviteModal } from "@/components/referly/InviteModal";
import { VerificationUpload } from "@/components/referly/VerificationUpload";
import { DocumentUpload } from "@/components/referly/DocumentUpload";
import { toast } from "sonner";

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [ivoUploadOpen, setIvoUploadOpen] = useState(false);
  const [hospUploadOpen, setHospUploadOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const { profileStatus, loading: refLoading, refresh: refreshRef } = useRefProfile(user?.id);
  const { actions, loading: actionsLoading, refresh: refreshActions } = useActionItems(user?.id);

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

  const handleAction = (type: string) => {
    if (type === "missing_reference") setInviteOpen(true);
    else if (type === "add_ivo") setIvoUploadOpen(true);
    else if (type === "add_hosp") setHospUploadOpen(true);
  };

  const handleRefreshAll = () => {
    refreshRef();
    refreshActions();
  };

  const handleVerifyBankId = () => {
    setVerifyOpen(true);
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-20 pb-12 px-4 max-w-2xl mx-auto space-y-5">

