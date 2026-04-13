import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface InvoiceReview {
  id: string;
  created_at: string;
  status: string;
  yrkeskategori: string | null;
  phone: string | null;
  grundpris: number | null;
  forvantad_summa: number | null;
  fakturerad_summa: number | null;
  differens: number | null;
  har_avvikelse: boolean;
  avvikelser: any[] | null;
  extracted_faktura: any;
  extracted_tidrapport: any;
  confirmed_tidrapport: any;
  faktura_path: string | null;
  tidrapport_path: string | null;
  admin_notes: string | null;
  error_message: string | null;
}

export default function InvoiceReviews() {
  const [reviews, setReviews] = useState<InvoiceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", {
        body: { action: "invoice-reviews" },
      });
      if (error) throw error;
      setReviews((data?.reviews as InvoiceReview[]) || []);
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleAction = async (reviewId: string, action: "approve" | "reject") => {
    setActing(reviewId);
    try {
      const { error } = await supabase.functions.invoke("admin-review-action", {
        body: {
          review_id: reviewId,
          action,
          admin_notes: notes[reviewId] || null,
        },
      });
      if (error) throw error;
      toast({ title: action === "approve" ? "Godkänd" : "Avvisad" });
      fetchReviews();
    } catch (err: any) {
      toast({ title: "Fel", description: err.message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const statusBadge = (status: string, harAvvikelse: boolean) => {
    if (status === "pending_review") {
      return harAvvikelse
        ? <Badge variant="destructive">Avvikelse</Badge>
        : <Badge variant="secondary">Utan avvikelse</Badge>;
    }
    if (status === "approved") return <Badge className="bg-green-600">Godkänd</Badge>;
    if (status === "rejected") return <Badge variant="destructive">Avvisad</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" /> Fakturagranskning
        </CardTitle>
        <CardDescription>
          {reviews.filter(r => r.status === "pending_review").length} ärenden väntar på granskning
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Inga ärenden.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    {statusBadge(r.status, r.har_avvikelse)}
                    <span className="text-sm font-medium">{r.yrkeskategori || "–"}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("sv-SE")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    {expandedId === r.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Grundpris:</span>{" "}
                    <span className="font-medium">{r.grundpris ?? "–"} kr/h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Förväntat:</span>{" "}
                    <span className="font-medium">{r.forvantad_summa?.toLocaleString("sv-SE") ?? "–"} kr</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fakturerat:</span>{" "}
                    <span className="font-medium">{r.fakturerad_summa?.toLocaleString("sv-SE") ?? "–"} kr</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Diff:</span>{" "}
                    <span className={`font-medium ${(r.differens ?? 0) !== 0 ? "text-destructive" : ""}`}>
                      {r.differens?.toLocaleString("sv-SE") ?? "–"} kr
                    </span>
                  </div>
                </div>

                {expandedId === r.id && (
                  <div className="space-y-4 pt-2 border-t">
                    {/* Avvikelser */}
                    {r.avvikelser && (r.avvikelser as any[]).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Avvikelser</h4>
                        <ul className="space-y-1 text-sm">
                          {(r.avvikelser as any[]).map((a: any, i: number) => (
                            <li key={i} className="flex gap-2">
                              <Badge variant="outline" className="text-xs shrink-0">{a.kod}</Badge>
                              <span>{a.beskrivning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Extracted data preview */}
                    {r.extracted_tidrapport && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Extraherad tidrapport</h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                          {JSON.stringify(r.extracted_tidrapport, null, 2)}
                        </pre>
                      </div>
                    )}

                    {r.extracted_faktura && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Extraherad faktura</h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                          {JSON.stringify(r.extracted_faktura, null, 2)}
                        </pre>
                      </div>
                    )}

                    {r.error_message && (
                      <p className="text-sm text-destructive">Fel: {r.error_message}</p>
                    )}

                    {/* Admin actions */}
                    {r.status === "pending_review" && (
                      <div className="space-y-3 pt-2">
                        <Textarea
                          placeholder="Admin-anteckningar (valfritt)..."
                          value={notes[r.id] || ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, "approve")}
                          >
                            {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Godkänn
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            disabled={acting === r.id}
                            onClick={() => handleAction(r.id, "reject")}
                          >
                            {acting === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Avvisa
                          </Button>
                        </div>
                      </div>
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
