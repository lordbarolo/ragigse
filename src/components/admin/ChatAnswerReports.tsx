import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MessageSquareWarning } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ChatReport {
  id: string;
  message_content: string;
  context_json: Record<string, unknown> | null;
  user_email: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
}

export default function ChatAnswerReports() {
  const [reports, setReports] = useState<ChatReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "chat-answer-reports" },
      });
      if (error) throw error;
      setReports((data?.reports as ChatReport[]) || []);
    } catch (err: any) {
      console.error("Chat reports error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-data", {
        body: { action: "update-chat-report-status", id, status },
      });
      if (error) throw error;
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast({ title: "Status uppdaterad" });
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "destructive";
      case "reviewed": return "secondary";
      case "fixed": return "default";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5" /> Rapporterade AI-svar
        </CardTitle>
        <CardDescription>
          {reports.filter((r) => r.status === "new").length} nya rapporter av {reports.length} totalt.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Inga rapporterade svar ännu.</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {reports.map((r) => (
              <div key={r.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("sv-SE")}
                    </span>
                    {r.user_email && (
                      <span className="text-xs text-muted-foreground">· {r.user_email}</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {r.status === "new" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(r.id, "reviewed")}>
                        Granskad
                      </Button>
                    )}
                    {r.status !== "fixed" && (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(r.id, "fixed")}>
                        Åtgärdad
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                  {r.message_content.slice(0, 500)}{r.message_content.length > 500 ? "…" : ""}
                </p>
                {r.context_json && Object.keys(r.context_json).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.context_json).map(([k, v]) =>
                      v ? (
                        <Badge key={k} variant="outline" className="text-[10px]">
                          {k}: {String(v)}
                        </Badge>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
