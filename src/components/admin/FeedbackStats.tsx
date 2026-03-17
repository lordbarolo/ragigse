import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, RefreshCw, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FeedbackEntry {
  rating: string;
  comment: string | null;
  role: string | null;
  zone: string | null;
  created_at: string;
}

interface FeedbackData {
  total: number;
  by_rating: Record<string, number>;
  by_role: Record<string, Record<string, number>>;
  recent: FeedbackEntry[];
}

const ratingConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  yes: { label: "Ja", icon: <ThumbsUp className="w-4 h-4" />, color: "bg-green-100 text-green-700 border-green-200" },
  partial: { label: "Delvis", icon: <Minus className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  no: { label: "Nej", icon: <ThumbsDown className="w-4 h-4" />, color: "bg-red-100 text-red-700 border-red-200" },
};

export default function FeedbackStats() {
  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("feedback-stats");
      if (res.error) throw res.error;
      setData(res.data);
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Rapport-feedback
            </CardTitle>
            <CardDescription>Sammanställning av användarnas omdömen om rapporten.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1">Ladda</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Klicka "Ladda" för att hämta statistik.</p>
        ) : data.total === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-sm">Inga omdömen ännu.</p>
        ) : (
          <div className="space-y-6">
            {/* Summary badges */}
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline">Totalt: {data.total}</Badge>
              {Object.entries(ratingConfig).map(([key, cfg]) => (
                <Badge key={key} className={cfg.color}>
                  <span className="flex items-center gap-1">
                    {cfg.icon} {cfg.label}: {data.by_rating[key] || 0}
                  </span>
                </Badge>
              ))}
            </div>

            {/* NPS-like score */}
            {data.total > 0 && (
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground">
                  Nöjdhetsgrad:{" "}
                  <span className="text-lg font-bold text-primary">
                    {Math.round(((data.by_rating["yes"] || 0) / data.total) * 100)}%
                  </span>
                  <span className="text-muted-foreground ml-1 text-xs">svarade "Ja"</span>
                </p>
              </div>
            )}

            {/* By role */}
            {Object.keys(data.by_role).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Per yrkesroll</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium">Roll</th>
                        <th className="pb-2 font-medium text-center">Ja</th>
                        <th className="pb-2 font-medium text-center">Delvis</th>
                        <th className="pb-2 font-medium text-center">Nej</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.by_role).map(([role, ratings]) => (
                        <tr key={role} className="border-b last:border-0">
                          <td className="py-2">{role}</td>
                          <td className="py-2 text-center text-green-600 font-mono">{ratings["yes"] || 0}</td>
                          <td className="py-2 text-center text-yellow-600 font-mono">{ratings["partial"] || 0}</td>
                          <td className="py-2 text-center text-red-600 font-mono">{ratings["no"] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent feedback */}
            <div>
              <h4 className="text-sm font-medium mb-2">Senaste omdömen</h4>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b text-left">
                      <th className="p-2 font-medium">Betyg</th>
                      <th className="p-2 font-medium">Roll</th>
                      <th className="p-2 font-medium">Zon</th>
                      <th className="p-2 font-medium">Kommentar</th>
                      <th className="p-2 font-medium">Datum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((r, i) => {
                      const cfg = ratingConfig[r.rating] || ratingConfig.yes;
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="p-2">
                            <Badge className={cfg.color} variant="outline">
                              <span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span>
                            </Badge>
                          </td>
                          <td className="p-2">{r.role || "–"}</td>
                          <td className="p-2">{r.zone || "–"}</td>
                          <td className="p-2 text-muted-foreground max-w-[250px] truncate">{r.comment || "–"}</td>
                          <td className="p-2 text-muted-foreground whitespace-nowrap">
                            {new Date(r.created_at).toLocaleString("sv-SE")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
