import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Finding {
  invoiceRef?: string;
  workedHours?: number;
  invoicedHours?: number;
  diffHours?: number;
  diffAmountSek?: number;
  type?: string;
  description?: string;
}

interface Props {
  findings: Finding[];
  totalRecoverable?: number;
  consultantName?: string;
  agencyName?: string;
  defaultRecipientEmail?: string;
}

interface DraftResponse {
  subject: string;
  body: string;
  mailtoUrl: string;
}

export default function InvoiceEmailDrafter({ findings, totalRecoverable, consultantName, agencyName, defaultRecipientEmail }: Props) {
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipientEmail || "");
  const [recipientName, setRecipientName] = useState("");
  const [tone, setTone] = useState<"neutral" | "formal" | "friendly">("neutral");
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!findings || findings.length === 0) {
      toast.error("Inga avvikelser att skapa mejl för.");
      return;
    }
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("ai-invoice-to-email", {
        body: {
          findings,
          totalRecoverable,
          consultantName,
          agencyName,
          recipientName: recipientName || undefined,
          recipientEmail: recipientEmail || undefined,
          tone,
        },
      });
      if (error) throw error;
      if ((resp as any)?.error) {
        toast.error((resp as any)?.message || "Kunde inte skapa utkast.");
        return;
      }
      setDraft(resp as DraftResponse);
    } catch (err: any) {
      if (err?.context?.status === 429) toast.error("Du har nått dagens AI-gräns.");
      else if (err?.context?.status === 402) toast.error("AI-krediter saknas.");
      else toast.error(err?.message || "Kunde inte skapa utkast.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`Ämne: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      toast.success("Mejlutkastet kopierat.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kunde inte kopiera.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          Skapa mejl till bemanningsbolaget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!draft ? (
          <>
            <p className="text-sm text-muted-foreground">
              AI hjälper dig formulera ett professionellt mejl baserat på avvikelserna ({findings.length} st
              {totalRecoverable ? `, ca ${totalRecoverable.toLocaleString("sv-SE")} kr` : ""}).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Mottagarens namn (valfritt)</label>
                <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Anna Andersson" className="h-9 text-sm mt-1" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground">Mottagarens mejl (valfritt)</label>
                <Input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="anna@bemanningsbolag.se" className="h-9 text-sm mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Tonläge</label>
              <div className="flex gap-2 mt-1">
                {(["neutral", "formal", "friendly"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border hover:bg-muted"
                    }`}
                  >
                    {t === "neutral" ? "Neutral" : t === "formal" ? "Formell" : "Vänlig"}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={generate} disabled={loading} size="sm" className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {loading ? "Skapar utkast…" : "Skapa mejlutkast"}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Ämne</label>
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className="h-9 text-sm mt-1 font-medium" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Brödtext</label>
              <Textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                className="text-sm mt-1 min-h-[180px] font-mono"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={copyAll} className="gap-1.5">
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopierat" : "Kopiera"}
              </Button>
              <a
                href={
                  recipientEmail
                    ? `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
                    : `mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
                }
              >
                <Button size="sm" className="gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Öppna i mejl
                </Button>
              </a>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                Skapa nytt
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              AI-utkast. Inget skickas från CompCare — du är avsändare. Granska alltid texten innan du skickar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
