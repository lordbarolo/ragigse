import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Loader2, CheckCircle, Clock, Archive } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BugReport {
  id: string;
  created_at: string;
  page_url: string;
  category: string;
  description: string;
  email: string | null;
  status: string;
}

const categoryLabel: Record<string, string> = {
  calculation: "Beräkning",
  data: "Data",
  ui: "Visning",
  general: "Övrigt",
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  new: { label: "Ny", variant: "default" },
  reviewing: { label: "Granskas", variant: "secondary" },
  resolved: { label: "Löst", variant: "outline" },
};

export default function BugReports() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "bug-reports" },
      });
      if (error) throw error;
      setReports(data?.reports || []);
    } catch (err: any) {
      console.error("Bug reports error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-data", {
        body: { action: "update-bug-status", id, status },
      });
      if (error) throw error;
      setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      toast({ title: "Status uppdaterad" });
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    }
  };

  const newCount = reports.filter((r) => r.status === "new").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Felrapporter
          {newCount > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">{newCount} nya</Badge>
          )}
        </CardTitle>
        <CardDescription>{reports.length} rapporter totalt.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Inga felrapporter ännu.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {reports.map((r) => {
              const sc = statusConfig[r.status] || statusConfig.new;
              return (
                <div key={r.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">{categoryLabel[r.category] || r.category}</Badge>
                      <Badge variant={sc?.variant} className="text-xs">{sc?.label}</Badge>
                      <span className="text-xs text-muted-foreground">{r.page_url}</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("sv-SE")}
                    </span>
                  </div>
                  <p className="text-sm">{r.description}</p>
                  {r.email && (
                    <p className="text-xs text-muted-foreground">📧 {r.email}</p>
                  )}
                  <div className="flex gap-1.5">
                    {r.status !== "reviewing" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "reviewing")}>
                        <Clock className="w-3 h-3" /> Granskar
                      </Button>
                    )}
                    {r.status !== "resolved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "resolved")}>
                        <CheckCircle className="w-3 h-3" /> Löst
                      </Button>
                    )}
                    {r.status === "resolved" && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => updateStatus(r.id, "new")}>
                        <Archive className="w-3 h-3" /> Återöppna
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
