import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Link2, Check, FileText, Copy, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const EXPIRY_OPTIONS = [
  { value: "24", label: "24 timmar" },
  { value: "72", label: "3 dagar" },
  { value: "168", label: "7 dagar" },
  { value: "720", label: "30 dagar" },
  { value: "2160", label: "90 dagar" },
];

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certifikat / Intyg",
  license: "Legitimation",
  contract: "Avtal",
  ivo: "IVO-intyg",
  hosp: "HOSP-intyg",
  other: "Övrigt",
};

export default function ShareDocumentsDialog({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiry, setExpiry] = useState("168");
  const [recipient, setRecipient] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setShareUrl(null);
    setCopied(false);
    setSelected(new Set());
    setRecipient("");
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

  const canSubmit = selected.size > 0 && !submitting;

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_document_share", {
        _document_ids: Array.from(selected),
        _expires_in_hours: Number(expiry),
        _recipient_label: recipient.trim() || null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const token = (row as any)?.token;
      if (!token) throw new Error("Ingen token returnerades");
      const url = `${window.location.origin}/delade-dokument/${token}`;
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

  const expiryLabel = useMemo(
    () => EXPIRY_OPTIONS.find((e) => e.value === expiry)?.label,
    [expiry],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white">
        <DialogHeader>
          <DialogTitle>Dela dokument via länk</DialogTitle>
          <DialogDescription>
            Skapa en säker länk till valda dokument. Du bestämmer hur länge den ska fungera och kan skicka den direkt via e-post eller SMS — eller kopiera och dela själv.
          </DialogDescription>
        </DialogHeader>

        {shareUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Klar! Länken fungerar i {expiryLabel?.toLowerCase()}. Skicka den till mottagaren via e-post, SMS eller valfri chatt.
            </div>

            <div>
              <Label className="text-xs font-medium text-slate-700 mb-1 block">Länk</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs bg-white text-slate-900" />
                <Button onClick={handleCopy} variant="outline" className="text-sm font-semibold px-4 py-3 gap-1.5">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Kopierad" : "Kopiera"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={`mailto:?subject=${encodeURIComponent(`Dokument från ${recipient ? recipient : "CompCare"}`)}&body=${encodeURIComponent(`Hej,\n\nHär är en säker länk till mina dokument (giltig i ${expiryLabel?.toLowerCase()}):\n\n${shareUrl}\n\nVänliga hälsningar`)}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 text-sm font-semibold px-4 py-3"
              >
                <Mail className="w-4 h-4" />
                Skicka via e-post
              </a>
              <a
                href={`sms:?&body=${encodeURIComponent(`Länk till mina dokument (giltig i ${expiryLabel?.toLowerCase()}): ${shareUrl}`)}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 text-sm font-semibold px-4 py-3"
              >
                <MessageSquare className="w-4 h-4" />
                Skicka via SMS
              </a>
            </div>

            <p className="text-[11px] text-slate-500">
              E-post och SMS öppnas i din egen app med länken förifylld — du ser och kan redigera innan du skickar.
            </p>

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
              <ul className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1 block">Giltig i</Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className="bg-white text-slate-900"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {EXPIRY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-slate-700 mb-1 block">Mottagare (valfritt)</Label>
                <Input
                  placeholder="t.ex. Region Skåne"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!canSubmit}
              className="w-full text-sm font-semibold px-6 py-3 gap-1.5 text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              Skapa delningslänk
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
