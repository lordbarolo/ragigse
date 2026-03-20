import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, MousePointerClick, CheckCircle2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralRow {
  id: string;
  referrer_email: string;
  referee_email: string;
  clicked: boolean;
  created_at: string;
}

export default function ReferralStats() {
  const [data, setData] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase
        .from("referrals")
        .select("id, referrer_email, referee_email, clicked, created_at")
        .order("created_at", { ascending: false });
      if (!error) setData(rows || []);
      setLoading(false);
    })();
  }, []);

  const total = data.length;
  const uniqueReferrers = new Set(data.map((r) => r.referrer_email)).size;
  const clicked = data.filter((r) => r.clicked).length;
  const ctr = total > 0 ? Math.round((clicked / total) * 100) : 0;

  const stats = [
    { label: "Skickade", value: total, icon: Send, color: "text-primary" },
    { label: "Unika avsändare", value: uniqueReferrers, icon: Users, color: "text-accent" },
    { label: "Klickade", value: `${clicked} (${ctr}%)`, icon: MousePointerClick, color: "text-chart-1" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" /> Referral-statistik
        </CardTitle>
        <CardDescription>Översikt av skickade, klickade och bekräftade referrals.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : total === 0 ? (
          <p className="text-muted-foreground text-center py-4">Inga referrals ännu.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center space-y-1">
                  <s.icon className={`w-5 h-5 mx-auto ${s.color}`} />
                  <div className="text-2xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium">Avsändare</th>
                    <th className="p-2 font-medium">Mottagare</th>
                    <th className="p-2 font-medium">Status</th>
                    <th className="p-2 font-medium">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="p-2 truncate max-w-[140px]">{r.referrer_email}</td>
                      <td className="p-2 truncate max-w-[140px]">{r.referee_email}</td>
                      <td className="p-2">
                        {r.clicked ? (
                          <Badge className="bg-accent/20 text-accent border-accent/30">Bekräftad</Badge>
                        ) : (
                          <Badge variant="secondary">Skickad</Badge>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString("sv-SE")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
