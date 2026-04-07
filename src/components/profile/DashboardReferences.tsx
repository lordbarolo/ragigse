import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, FileUp, Loader2 } from "lucide-react";

interface RefSummary {
  total: number;
  verified: number;
  pending: number;
}

export default function DashboardReferences() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<RefSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("ref_references")
        .select("id, status")
        .eq("owner_id", user.id) as { data: { id: string; status: string }[] | null; error: any };

      const refs = data || [];
      setSummary({
        total: refs.length,
        verified: refs.filter((r: any) => r.status === "verified" || r.status === "attachable").length,
        pending: refs.filter((r: any) => r.status === "pending" || r.status === "submitted").length,
      });
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Mina referenser
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : summary && summary.total > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{summary.verified}</span> verifierade
              </span>
              {summary.pending > 0 && (
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{summary.pending}</span> väntar
                </span>
              )}
            </div>
            <Link to="/consultant/referenser">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="w-4 h-4" />
                Hantera referenser
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">Inga referenser ännu</p>
            <Link to="/consultant/referenser">
              <Button size="sm" className="gap-1.5">
                <UserPlus className="w-4 h-4" />
                Bjud in referensgivare
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
