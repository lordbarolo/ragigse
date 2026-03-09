import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoleStat {
  role: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface KommunStat {
  kommun: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface RoleKommunStat {
  role: string;
  kommun: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface InsightsData {
  total_leads_with_salary: number;
  by_role: RoleStat[];
  by_kommun: KommunStat[];
  by_role_kommun: RoleKommunStat[];
}

export default function SalaryInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("salary-insights");
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as InsightsData);
    } catch (e: any) {
      toast({ title: "Fel", description: e.message, variant: "destructive" });
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
              <BarChart3 className="w-5 h-5" />
              Angiven ersättning – marknadsöversikt
            </CardTitle>
            <CardDescription>
              Aggregerad data från användarnas angivna ersättningar (normaliserat till kr/h).
            </CardDescription>
          </div>
          <Button onClick={fetchInsights} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">{data ? "Uppdatera" : "Ladda data"}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!data && !loading && (
          <p className="text-muted-foreground text-center py-6 text-sm">
            Klicka "Ladda data" för att hämta aggregerad lönestatistik.
          </p>
        )}

        {data && (
          <div className="space-y-6">
            <Badge variant="outline" className="text-sm">
              {data.total_leads_with_salary} leads med lönedata
            </Badge>

            {/* By Role */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Per yrkesroll</h3>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Yrkesroll</th>
                      <th className="p-2 font-medium text-right">Antal</th>
                      <th className="p-2 font-medium text-right">Snitt kr/h</th>
                      <th className="p-2 font-medium text-right">Median kr/h</th>
                      <th className="p-2 font-medium text-right">Min</th>
                      <th className="p-2 font-medium text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_role.map((r) => (
                      <tr key={r.role} className="border-t">
                        <td className="p-2">{r.role}</td>
                        <td className="p-2 text-right font-mono">{r.count}</td>
                        <td className="p-2 text-right font-mono font-semibold">{r.avg}</td>
                        <td className="p-2 text-right font-mono">{r.median}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{r.min}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{r.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Kommun */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Per kommun (topp 20)</h3>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="text-left">
                      <th className="p-2 font-medium">Kommun</th>
                      <th className="p-2 font-medium text-right">Antal</th>
                      <th className="p-2 font-medium text-right">Snitt kr/h</th>
                      <th className="p-2 font-medium text-right">Median kr/h</th>
                      <th className="p-2 font-medium text-right">Min</th>
                      <th className="p-2 font-medium text-right">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_kommun.slice(0, 20).map((k) => (
                      <tr key={k.kommun} className="border-t">
                        <td className="p-2">{k.kommun}</td>
                        <td className="p-2 text-right font-mono">{k.count}</td>
                        <td className="p-2 text-right font-mono font-semibold">{k.avg}</td>
                        <td className="p-2 text-right font-mono">{k.median}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{k.min}</td>
                        <td className="p-2 text-right font-mono text-muted-foreground">{k.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By Role + Kommun */}
            {data.by_role_kommun.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Per yrkesroll + kommun (≥2 svar)</h3>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Yrkesroll</th>
                        <th className="p-2 font-medium">Kommun</th>
                        <th className="p-2 font-medium text-right">Antal</th>
                        <th className="p-2 font-medium text-right">Snitt kr/h</th>
                        <th className="p-2 font-medium text-right">Median kr/h</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_role_kommun.map((rk, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{rk.role}</td>
                          <td className="p-2">{rk.kommun}</td>
                          <td className="p-2 text-right font-mono">{rk.count}</td>
                          <td className="p-2 text-right font-mono font-semibold">{rk.avg}</td>
                          <td className="p-2 text-right font-mono">{rk.median}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
