import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Send, Check, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DocRow {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certifikat / Intyg",
  license: "Legitimation",
  contract: "Avtal",
  ivo: "IVO-intyg",
  hosp: "HOSP-intyg",
  other: "Övrigt",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ShareDocumentsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipientEmail, setRecipientEmail] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setShareUrl(null);
    setSentTo(null);
    setCopied(false);
    setSelected(new Set());
    setRecipientEmail("");
    setPersonalMessage("");
    setLoading(true);
    (async () => {
      const { data: cp } = await supabase
        .from("consultant_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cp) { setLoading(false); return; }
      const { data } = await supabase
        .from("consultant_documents")
        .select("id, file_name, document_type, uploaded_at")
        .eq("consultant_id", cp.id)
        .order("uploaded_at", { ascending: false });
      setDocs(data || []);
      setSelected(new Set((data || []).map((d) => d.id)));
      setLoading(false);
    })();
  }, [open, user]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const emailValid = EMAIL_REGEX.test(recipientEmail.trim());
  const canSubmit = selected.size > 0 && emailValid && !submitting;

  const handleCreateAndSend = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const email = recipientEmail.trim().toLowerCase();
      const { data, error } = await supabase.rpc("create_document_share", {
        _document_ids: Array.from(selected),
        _expires_in_hours: 0, // 0 = no expiry
        _recipient_label: email,
        _recipient_email: email,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const token = (row as any)?.token;
      if (!token) throw new Error("Ingen token returnerades");
      const url = `${window.location.origin}/delade-dokument/${token}`;

      // Send invite email via existing transactional pipeline
      const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "document-share-invite",
          recipientEmail: email,
          idempotencyKey: `doc-share-${(row as any)?.id}`,
          templateData: {
            ownerName: user?.user_metadata?.full_name || user?.email || "En kollega",
            documentCount: selected.size,
            inviteUrl: url,
            personalMessage: personalMessage.trim() || undefined,
          },
        },
      });
      if (mailErr) {
        console.error("mail error", mailErr);
        toast.warning("Länken är skapad men mejlet kunde inte skickas", {
          description: "Du kan kopiera länken och skicka den manuellt.",
        });
      } else {
        toast.success(`Länk skickad till ${email}`);
        setSentTo(email);
      }
      setShareUrl(url);
    } catch (err: any) {
      console.error(err);
      toast.error("Kunde inte skapa delningslänk", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Dela dokument via e-post</DialogTitle>
          <DialogDescription>
            Vi mejlar en personlig länk till mottagaren. När de öppnat länken kan de ladda
            ner dokumenten — varje sida märks med deras e-postadress.
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {sentTo
                ? <>Klart! Mejl skickat till <strong>{sentTo}</strong> med en personlig länk.</>
                : <>Länk skapad. Skicka den manuellt till mottagaren.</>}
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">
                Länk (för säkerhets skull)
              </Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs bg-white text-slate-900" />
                <Button onClick={handleCopy} variant="outline" className="text-sm font-semibold px-4 py-3 gap-1.5">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopierad" : "Kopiera"}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Länken har ingen utgångstid. Du kan återkalla den när som helst under "Aktivitet".
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-sm font-semibold px-6 py-3"
            >
              Stäng
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            Du har inga uppladdade dokument. Ladda upp ett dokument först.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-slate-700 mb-2 block">Dokument att dela</Label>
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-3 py-2">
                    <Checkbox
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggle(d.id)}
                      id={`doc-${d.id}`}
                    />
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <label htmlFor={`doc-${d.id}`} className="flex-1 min-w-0 cursor-pointer">
                      <p className="text-sm text-slate-900 truncate">{d.file_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {DOC_TYPE_LABELS[d.document_type] || d.document_type}
                      </p>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <Label htmlFor="recipient-email" className="text-xs font-medium text-slate-700 mb-1 block">
                Mottagarens e-post
              </Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="namn@bemanningsbolag.se"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="bg-white text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                E-postadressen syns som watermark på varje sida av nedladdade PDF:er.
              </p>
            </div>

            <div>
              <Label htmlFor="personal-message" className="text-xs font-medium text-slate-700 mb-1 block">
                Personligt meddelande (valfritt)
              </Label>
              <Textarea
                id="personal-message"
                placeholder="Hej! Här är mina handlingar inför uppdraget."
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                rows={2}
                className="bg-white text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            <Button
              onClick={handleCreateAndSend}
              disabled={!canSubmit}
              className="text-sm font-semibold px-6 py-3 gap-1.5 text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Skicka länk via e-post
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
