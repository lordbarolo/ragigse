import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Loader2, FileText, ArrowRight } from "lucide-react";

interface AnalysisItem {
  id: string;
  role: string | null;
  location: string | null;
  employment_type: string | null;
  created_at: string;
}

export default function MyAnalyses() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/"); return; }

      setUserEmail(session.user.email || "");

      // RLS ensures only own analyses are returned
      const { data } = await supabase
        .from("analyses")
        .select("id, role, location, employment_type, created_at")
        .order("created_at", { ascending: false });

      if (data) setAnalyses(data);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 px-4 py-8 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mina analyser</h1>
          <p className="text-sm text-muted-foreground mt-1">Inloggad som {userEmail}</p>
        </div>

        {analyses.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">Du har inga analyser ännu.</p>
            <Button onClick={() => navigate("/")}>Gör din första analys</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  // Find matching report to navigate to
                  // For now link back to home since analyses don't have report_id yet
                  navigate("/");
                }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent/5 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {a.role || "Analys"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.location || "–"} · {a.employment_type === "foretagare" ? "Eget bolag" : "Anställd"}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(a.created_at).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="pt-4 flex flex-col gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>Gör en ny analys</Button>
          <Button
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
          >
            Logga ut
          </Button>
        </div>
      </main>
    </div>
  );
}
