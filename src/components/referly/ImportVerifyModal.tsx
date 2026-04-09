import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RELATIONSHIPS } from "@/types/referly";
import { Upload, FileText, X } from "lucide-react";

const MONTHS = [
  "Januari", "Februari", "Mars", "April", "Maj", "Juni",
  "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => String(currentYear - i));

interface ImportVerifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function ImportVerifyModal({ open, onOpenChange, userId, onSuccess }: ImportVerifyModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [startMonth, setStartMonth] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endMonth, setEndMonth] = useState("");
  const [endYear, setEndYear] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEmail(""); setName(""); setRelationship(""); setWorkplace("");
    setStartMonth(""); setStartYear(""); setEndMonth(""); setEndYear("");
    setPersonalMessage(""); setInviteLink(null); setFile(null);
  };

  const toDateStr = (month: string, year: string) =>
    `${year}-${String(Number(month) + 1).padStart(2, "0")}-01`;

  const hasStart = startMonth !== "" && startYear !== "";
  const hasEnd = endMonth !== "" && endYear !== "";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (f.size > maxSize) {
      toast.error("Filen är för stor (max 10 MB)");
      return;
    }
    const allowed = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowed.includes(f.type)) {
      toast.error("Endast PDF, PNG eller JPG tillåts");
      return;
    }
    setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Ladda upp referenshandlingen");
      return;
    }
    setLoading(true);

    // Upload file to verifications bucket
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/imported-refs/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("verifications")
      .upload(filePath, file, { contentType: file.type });

    if (uploadErr) {
      toast.error("Kunde inte ladda upp filen", { description: uploadErr.message });
      setLoading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("verifications").getPublicUrl(filePath);

    const token = crypto.randomUUID();
    const { error } = await supabase.from("ref_references").insert({
      individual_id: userId,
      giver_email: email,
      giver_name: name,
      workplace,
      relationship,
      period_start: hasStart ? toDateStr(startMonth, startYear) : "",
      period_end: hasEnd ? toDateStr(endMonth, endYear) : null,
      invite_token: token,
      is_verification_only: true,
      document_url: urlData.publicUrl,
      document_name: file.name,
    });

    if (error) {
      setLoading(false);
      toast.error("Kunde inte skapa verifieringsinbjudan", { description: error.message });
      return;
    }

    const link = `${window.location.origin}/referens/${token}`;
    setInviteLink(link);

    // Fetch individual name for email
    const { data: profile } = await supabase
      .from("ref_profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    // Send verification invite email
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "reference-invite",
        recipientEmail: email,
        idempotencyKey: `ref-verify-${token}`,
        templateData: {
          individualName: profile?.full_name || "",
          workplace,
          relationship,
          isVerification: true,
          personalMessage: personalMessage || undefined,
          inviteUrl: link,
        },
      },
    });

    setLoading(false);
    onSuccess();
    toast.success("Verifieringsinbjudan skickad!");
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Länk kopierad!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verifiera importerad referens</DialogTitle>
          <DialogDescription>
            Ladda upp din referenshandling och bjud in referensgivaren att bekräfta att den fortfarande gäller.
          </DialogDescription>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Verifieringsinbjudan skapad. Skicka länken till referensgivaren.</p>
            <div className="rounded-md border border-border bg-muted p-3">
              <p className="text-xs text-muted-foreground break-all">{inviteLink}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} className="flex-1">Kopiera länk</Button>
              <Button variant="outline" onClick={resetForm}>Ny verifiering</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File upload */}
            <div className="space-y-2">
              <Label>Referenshandling</Label>
              {file ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setFile(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klicka för att ladda upp</span>
                  <span className="text-xs text-muted-foreground/60">PDF, PNG eller JPG · Max 10 MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="verify-email">E-postadress till referensgivaren</Label>
              <Input id="verify-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-name">Namn på referensgivaren</Label>
              <Input id="verify-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Relation</Label>
              <Select value={relationship} onValueChange={setRelationship} required>
                <SelectTrigger><SelectValue placeholder="Välj relation" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-workplace">Arbetsplats</Label>
              <Input id="verify-workplace" value={workplace} onChange={(e) => setWorkplace(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Period start</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger><SelectValue placeholder="Månad" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (<SelectItem key={m} value={String(i)}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={startYear} onValueChange={setStartYear}>
                  <SelectTrigger><SelectValue placeholder="År" /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Period slut</Label>
              <div className="grid grid-cols-2 gap-2">
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger><SelectValue placeholder="Månad" /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (<SelectItem key={m} value={String(i)}>{m}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={endYear} onValueChange={setEndYear}>
                  <SelectTrigger><SelectValue placeholder="År" /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-message">Personligt meddelande (valfritt)</Label>
              <Textarea id="verify-message" value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)} placeholder="T.ex. 'Hej Anders, kan du bekräfta att referensen fortfarande gäller?'" rows={3} maxLength={500} className="resize-none" />
              <p className="text-xs text-muted-foreground">{personalMessage.length}/500</p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !relationship || !hasStart || !file}>
              {loading ? "Skapar verifiering…" : "Skicka verifieringsinbjudan"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
