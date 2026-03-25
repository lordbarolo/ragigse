import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/radar/BottomNav";
import { ReferenceDashboard } from "@/components/referly/ReferenceDashboard";
import { Loader2 } from "lucide-react";

export default function Referenser() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/logga-in");
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 px-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-1">Referenser</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Bevisa din kvalitet en gång — återanvänd alltid. Verifierade referenser som följer med dig oavsett bemanningsföretag.
        </p>
        <ReferenceDashboard />
      </div>
      <BottomNav />
    </div>
  );
}
