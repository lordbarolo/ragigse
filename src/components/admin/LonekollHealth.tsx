import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LONEKOLL_TOPICS } from "@/data/lonekollQuestions";
import { Loader2, RefreshCw } from "lucide-react";

interface HealthData {
  since: string;
  totals: { events: number; email_gate_completed: number; missing_question_reported: number };
  topics: Record<string, number>;
  questions: Record<string, number>;
  reports: Record<string, number>;
  recent_chat_reports: Array<{
    id: string;
    created_at: string;
    message_content: string;
    user_email: string | null;
    page_url: string | null;
    status: string;
  }>;
}

export default function LonekollHealth() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("lonekoll-health");
    if (err) setError(err.message);
    else setData(res as HealthData);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const topQuestion = (topicId: number, qid: string) =>
    data?.questions[`${topicId}:${qid}`] ?? 0;
  const reportFor = (topicId: number, qid: string) =>
    data?.reports[`${topicId}:${qid}`] ?? 0;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Lönekoll — Tracking (senaste 30 dagar)</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading} className="text-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Laddar…</p>}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">E-postgate klar</div>
                <div className="text-2xl font-semibold">{data.totals.email_gate_completed}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Saknade frågor</div>
                <div className="text-2xl font-semibold">{data.totals.missing_question_reported}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">Totalt events</div>
                <div className="text-2xl font-semibold">{data.totals.events}</div>
              </div>
            </div>

            {LONEKOLL_TOPICS.map((topic) => (
              <div key={topic.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {topic.icon} {topic.title}
                  </h4>
                  <Badge variant="secondary">{data.topics[String(topic.id)] ?? 0} klick</Badge>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-1 font-normal">Fråga</th>
                      <th className="py-1 font-normal text-right w-20">Klick</th>
                      <th className="py-1 font-normal text-right w-24">Felrapport</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topic.questions.map((q) => {
                      const clicks = topQuestion(topic.id, q.id);
                      const reports = reportFor(topic.id, q.id);
                      return (
                        <tr key={q.id} className="border-t">
                          <td className="py-1.5 pr-2">{q.label}</td>
                          <td className="py-1.5 text-right tabular-nums">{clicks}</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {reports > 0 ? (
                              <span className="text-destructive font-medium">{reports}</span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

            {data.recent_chat_reports.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Senaste fritextrapporter (saknad fråga)</h4>
                <ul className="space-y-2">
                  {data.recent_chat_reports.map((r) => (
                    <li key={r.id} className="rounded border p-2 text-sm">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{new Date(r.created_at).toLocaleString("sv-SE")}</span>
                        <span>{r.user_email ?? "anonym"}</span>
                      </div>
                      <p className="mt-1">{r.message_content}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
