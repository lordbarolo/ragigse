import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileCheck,
  Loader2,
  CheckCircle2,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  BarChart3,
  FileOutput,
  HandCoins,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";

// ── Types ────────────────────────────────────────────────────────────────────

type FileSlot = "faktura" | "tidrapport";

interface UploadedFile {
  file: File;
  name: string;
}

interface ManualShift {
  datum: string;
  start_tid: string;
  slut_tid: string;
  rast_minuter: number;
  typ: "ordinarie" | "jour" | "beredskap";
}

interface ExtractionResult {
  faktura: Record<string, unknown>;
  tidrapport: Record<string, unknown> | null;
  confidence: {
    overall: number;
    rows: Array<{ index: number; match: boolean }>;
  };
}

const YRKESKATEGORIER = [
  "Läkare",
  "Sjuksköterska",
  "Barnmorska",
  "Övrigt",
];

const FILE_LABELS: Record<FileSlot, { label: string; desc: string }> = {
  faktura: { label: "Faktura", desc: "Din faktura till regionen" },
  tidrapport: { label: "Tidrapport", desc: "Signerad tidrapport" },
};

const STEP_LABELS = [
  { n: 1, label: "Ladda upp" },
  { n: 5, label: "Bekräftelse" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function FakturakontrollNy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const anonymousId = crypto.randomUUID();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<Partial<Record<FileSlot, UploadedFile>>>({});
  const [uploading, setUploading] = useState(false);
  const [phone, setPhone] = useState("");
  const [yrkeskategori, setYrkeskategori] = useState("");
  const [grundpris, setGrundpris] = useState("");
  const [isHandwritten, setIsHandwritten] = useState(false);
  const [manualShifts, setManualShifts] = useState<ManualShift[]>([
    { datum: "", start_tid: "07:00", slut_tid: "16:00", rast_minuter: 30, typ: "ordinarie" },
  ]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [dragOverSlot, setDragOverSlot] = useState<FileSlot | "any" | null>(null);

  useEffect(() => {
    trackEvent("fakturakontroll_ny_viewed");
  }, []);

  const phoneValid = /^[\d\s+\-()]{7,20}$/.test(phone.trim());
  const grundprisValid = Number(grundpris) > 0;
  const allUploaded = files.faktura && files.tidrapport;
  const manualValid = !isHandwritten || manualShifts.every((s) => s.datum && s.start_tid && s.slut_tid);

  const canSubmit = allUploaded && phoneValid && grundprisValid && yrkeskategori && manualValid && agreedToTerms;

  // ── File handling ────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((slot: FileSlot, file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Endast PDF-filer stöds.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen får vara max 10 MB.");
      return;
    }
    setFiles((prev) => ({ ...prev, [slot]: { file, name: file.name } }));
  }, []);

  const handleDrop = useCallback(
    (slot: FileSlot, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverSlot(null);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(slot, file);
    },
    [handleFileSelect],
  );

  // Combined dropzone: distributes dropped PDFs to empty slots in order (faktura → tidrapport)
  const handleCombinedDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverSlot(null);
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === "application/pdf",
      );
      if (dropped.length === 0) {
        toast.error("Endast PDF-filer stöds.");
        return;
      }
      setFiles((prev) => {
        const next = { ...prev };
        const order: FileSlot[] = ["faktura", "tidrapport"];
        let i = 0;
        for (const slot of order) {
          if (!next[slot] && i < dropped.length) {
            const f = dropped[i++];
            if (f.size > 10 * 1024 * 1024) {
              toast.error(`${f.name} är större än 10 MB.`);
              continue;
            }
            next[slot] = { file: f, name: f.name };
          }
        }
        return next;
      });
    },
    [],
  );

  // ── Manual shift helpers ─────────────────────────────────────────────────

  const addShift = () =>
    setManualShifts((prev) => [
      ...prev,
      { datum: "", start_tid: "07:00", slut_tid: "16:00", rast_minuter: 30, typ: "ordinarie" },
    ]);

  const removeShift = (i: number) =>
    setManualShifts((prev) => prev.filter((_, idx) => idx !== i));

  const updateShift = (i: number, field: keyof ManualShift, value: string | number) =>
    setManualShifts((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setUploading(true);

    try {
      const userId = user?.id ?? anonymousId;
      const paths: Record<FileSlot, string> = {} as Record<FileSlot, string>;

      for (const slot of ["faktura", "tidrapport"] as FileSlot[]) {
        const f = files[slot]!;
        const path = `${userId}/${Date.now()}_${slot}.pdf`;
        const { error } = await supabase.storage
          .from("invoice_reviews")
          .upload(path, f.file, { contentType: "application/pdf" });
        if (error) throw new Error(`Upload ${slot} failed: ${error.message}`);
        paths[slot] = path;
      }

      const { data: review, error: insertErr } = await supabase
        .from("invoice_reviews")
        .insert({
          user_id: userId,
          faktura_path: paths.faktura,
          tidrapport_path: paths.tidrapport,
          phone: phone.trim(),
          grundpris: Number(grundpris),
          yrkeskategori,
          is_handwritten: isHandwritten,
          manual_tidrapport: isHandwritten ? manualShifts : null,
          status: "pending",
          terms_accepted_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();

      if (insertErr || !review) throw new Error("Could not create review: " + insertErr?.message);
      setReviewId(review.id);

      trackEvent("fakturakontroll_uploaded");

      // Trigger extraction + analysis in the background — user is not informed about progress or results.
      // They only see a confirmation that we'll get back within 2 business days.
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authHeader = `Bearer ${session?.access_token ?? ""}`;

      // Fire-and-forget: chain extract -> analyzer server-side trigger, but never expose results to user.
      void fetch(`https://${projectId}.supabase.co/functions/v1/invoice-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({ review_id: review.id }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          // After successful extraction, kick off analyzer (admin-only result destination)
          await fetch(`https://${projectId}.supabase.co/functions/v1/invoice-analyzer`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify({ review_id: review.id }),
          });
        })
        .catch((e) => console.error("background invoice processing failed:", e));

      // Skip step 2/3/4 entirely — go straight to confirmation screen.
      setStep(5);
    } catch (err) {
      console.error(err);
      toast.error("Något gick fel. Försök igen.");
      setStep(1);
    } finally {
      setUploading(false);
    }
  };

  // ── Confirm & analyze ────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!reviewId || !extractionResult) return;
    setStep(4);

    try {
      const tidrapportRader = extractionResult.tidrapport
        ? (extractionResult.tidrapport as any).rader ?? []
        : [];

      // Save confirmed data
      await supabase
        .from("invoice_reviews")
        .update({
          confirmed_tidrapport: tidrapportRader,
          confirmed_at: new Date().toISOString(),
        } as any)
        .eq("id", reviewId);

      // Trigger analyzer
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch(`https://${projectId}.supabase.co/functions/v1/invoice-analyzer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ review_id: reviewId }),
      });

      trackEvent("fakturakontroll_confirmed");
      setStep(5);
    } catch (err) {
      console.error(err);
      toast.error("Analysfel. Vi har sparat dina filer och återkommer.");
      setStep(5);
    }
  };

  // ── Summary helpers ──────────────────────────────────────────────────────

  const getSummary = () => {
    if (!extractionResult?.tidrapport) return null;
    const rader = (extractionResult.tidrapport as any).rader ?? [];
    const totalTimmar = rader.reduce((sum: number, r: any) => {
      const s = parseTime(r.start_tid);
      let e = parseTime(r.slut_tid?.replace("+1", "") ?? "0");
      if (r.slut_tid?.includes("+1") || e < s) e += 24;
      return sum + Math.max(0, e - s - (r.rast_minuter || 0) / 60);
    }, 0);

    const nattpass = rader.filter((r: any) => {
      const start = parseTime(r.start_tid);
      return start >= 19 || start < 6;
    }).length;

    return {
      antalPass: rader.length,
      totalTimmar: Math.round(totalTimmar * 10) / 10,
      nattpass,
    };
  };

  // (auth gate removed – page is accessible without login)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-16">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8 text-xs font-medium text-muted-foreground flex-wrap">
        {STEP_LABELS.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step >= s.n
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={step >= s.n ? "text-foreground" : ""}>{s.label}</span>
            {i < STEP_LABELS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Upload + prices ────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Fakturagranskning
            </h1>
            <p className="text-muted-foreground text-sm">
              Vi analyserar om du fakturerat rätt och hjälper dig om du har pengar att hämta.
            </p>
          </div>

          {/* ── Processguide: Så fungerar tjänsten ──────────────────────── */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold tracking-tight">Så fungerar tjänsten</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Upload, title: "Ladda upp", desc: "Skicka in faktura och tidrapport" },
                { icon: BarChart3, title: "Analys", desc: "Vi jämför mot ramavtal" },
                { icon: FileOutput, title: "Rapport", desc: "Du får en detaljerad rapport" },
                { icon: HandCoins, title: "No cure, no pay", desc: "Betala bara vid avvikelser" },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-semibold">{s.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── No cure – no pay info ───────────────────────────────────── */}
          <div className="flex gap-3 items-start p-4 rounded-xl border border-primary/20 bg-primary/[0.03]">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Ingen risk — No cure, no pay</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vi granskar dina fakturor och tidrapporter utan kostnad. Hittar vi avvikelser hjälper vi dig att få betalt för det som tidigare missats. Hittas inget — kostar det inget.
              </p>
            </div>
          </div>

          <hr className="border-border" />

          <h2 className="text-sm font-semibold tracking-tight">Ladda upp dina dokument</h2>

          {/* Combined drag-and-drop zone: drop one or flera PDF:er här så fördelas de automatiskt */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverSlot !== "any") setDragOverSlot("any");
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setDragOverSlot((s) => (s === "any" ? null : s));
            }}
            onDrop={handleCombinedDrop}
            className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
              dragOverSlot === "any"
                ? "border-primary bg-primary/[0.06]"
                : "border-border/70 bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-3 px-1">
              <Upload className={`w-4 h-4 ${dragOverSlot === "any" ? "text-primary" : "text-muted-foreground"}`} />
              <p className="text-xs text-muted-foreground">
                {dragOverSlot === "any"
                  ? "Släpp filerna här — vi fördelar dem automatiskt"
                  : "Dra och släpp PDF:erna här, eller klicka på ett fält nedan"}
              </p>
            </div>

            {/* File uploads */}
            <div className="space-y-3">
              {(["faktura", "tidrapport"] as FileSlot[]).map((slot) => {
                const uploaded = files[slot];
                const meta = FILE_LABELS[slot];
                const isOver = dragOverSlot === slot;
                return (
                  <label
                    key={slot}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer bg-background ${
                      isOver
                        ? "border-primary bg-primary/[0.08] ring-2 ring-primary/20"
                        : uploaded
                          ? "border-primary/40 bg-primary/[0.03]"
                          : "border-border hover:border-primary/30"
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverSlot !== slot) setDragOverSlot(slot);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setDragOverSlot((s) => (s === slot ? null : s));
                    }}
                    onDrop={(e) => {
                      e.stopPropagation();
                      handleDrop(slot, e);
                    }}
                  >
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileSelect(slot, f);
                      }}
                    />
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        uploaded || isOver ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      {uploaded ? (
                        <FileCheck className="w-5 h-5 text-primary" />
                      ) : (
                        <Upload className={`w-5 h-5 ${isOver ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{meta.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {uploaded ? uploaded.name : isOver ? "Släpp PDF:en här" : meta.desc}
                      </p>
                    </div>
                    {uploaded && !isOver && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFiles((prev) => {
                            const next = { ...prev };
                            delete next[slot];
                            return next;
                          });
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 -m-1 shrink-0"
                        aria-label={`Ta bort ${meta.label.toLowerCase()}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {uploaded && isOver && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 px-1">
              PDF, max 10 MB per fil.
            </p>
          </div>

          {/* Yrkeskategori */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Yrkeskategori</label>
            <Select value={yrkeskategori} onValueChange={setYrkeskategori}>
              <SelectTrigger>
                <SelectValue placeholder="Välj yrkeskategori" />
              </SelectTrigger>
              <SelectContent>
                {YRKESKATEGORIER.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Grundpris */}
          <div>
            <label htmlFor="grundpris" className="block text-sm font-medium mb-1.5">
              Grundpris (SEK/timme)
            </label>
            <Input
              id="grundpris"
              type="number"
              placeholder="770"
              value={grundpris}
              onChange={(e) => setGrundpris(e.target.value)}
              min={0}
              max={5000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ditt avtalade timpris exklusive OB-tillägg.
            </p>
          </div>

          {/* Telefon */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
              Telefonnummer
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="070-123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Så att vi kan nå dig angående resultatet.
            </p>
          </div>

          {/* Handwritten checkbox */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="handwritten"
                checked={isHandwritten}
                onCheckedChange={(c) => setIsHandwritten(c === true)}
                className="mt-0.5"
              />
              <label htmlFor="handwritten" className="text-sm cursor-pointer">
                <span className="font-medium">Är din tidrapport handskriven?</span>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Våra assistenter klarar oftast av att läsa även handskrivna rapporter men om du vill
                  vara säker på att det blir rätt får du gärna hjälpa oss genom att ange datum,
                  arbetstid och antal timmar här.
                </p>
              </label>
            </div>

            {isHandwritten && (
              <div className="space-y-3 pl-7">
                {manualShifts.map((shift, i) => (
                  <div key={i} className="flex flex-wrap gap-2 items-end p-3 rounded-lg bg-muted/50">
                    <div className="w-[130px]">
                      <label className="text-xs text-muted-foreground">Datum</label>
                      <Input
                        type="date"
                        value={shift.datum}
                        onChange={(e) => updateShift(i, "datum", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="w-[90px]">
                      <label className="text-xs text-muted-foreground">Start</label>
                      <Input
                        type="time"
                        value={shift.start_tid}
                        onChange={(e) => updateShift(i, "start_tid", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="w-[90px]">
                      <label className="text-xs text-muted-foreground">Slut</label>
                      <Input
                        type="time"
                        value={shift.slut_tid}
                        onChange={(e) => updateShift(i, "slut_tid", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="w-[70px]">
                      <label className="text-xs text-muted-foreground">Rast (min)</label>
                      <Input
                        type="number"
                        value={shift.rast_minuter}
                        onChange={(e) => updateShift(i, "rast_minuter", Number(e.target.value))}
                        className="h-9 text-sm"
                        min={0}
                      />
                    </div>
                    <div className="w-[110px]">
                      <label className="text-xs text-muted-foreground">Typ</label>
                      <Select
                        value={shift.typ}
                        onValueChange={(v) => updateShift(i, "typ", v)}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ordinarie">Ordinarie</SelectItem>
                          <SelectItem value="jour">Jour</SelectItem>
                          <SelectItem value="beredskap">Beredskap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {manualShifts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => removeShift(i)}
                        aria-label="Ta bort pass"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addShift} className="gap-1.5">
                  <Plus className="w-4 h-4" /> Lägg till pass
                </Button>
              </div>
            )}
          </div>

          {/* Terms agreement */}
          <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(c) => setAgreedToTerms(c === true)}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-sm cursor-pointer">
              <span>
                Jag godkänner Compcares{" "}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="underline text-primary hover:text-primary/80 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      avtalsvillkor
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Compcares avtalsvillkor — Fakturagranskning</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                      <div className="prose prose-sm dark:prose-invert space-y-4">
                        <p className="text-xs text-muted-foreground">
                          <strong>Tjänsteleverantör:</strong> CompCare, nedan "CompCare"
                          <br />
                          <strong>Kund:</strong> {user?.email ?? "[kundens e-postadress]"}
                        </p>

                        <ol className="list-decimal pl-5 space-y-2 text-sm">
                          <li>
                            Kunden ger CompCare rätt att analysera insända dokument i syfte att
                            hitta avvikelser mellan fakturerad tid och rapporterad tid.
                          </li>
                          <li>
                            CompCare åtar sig att revidera materialet för att identifiera avvikelser
                            mellan fakturerade och faktiskt arbetade timmar.
                          </li>
                          <li>
                            Arvodet fastställs till <strong>25 %</strong> av det samlade beloppet som
                            identifieras som avvikelse. CompCare fakturerar först efter att resultatet
                            presenterats för kunden. Moms tillkommer.
                          </li>
                          <li>
                            CompCare arbetar efter principen <strong>"no cure – no pay"</strong> —
                            tjänsten är helt kostnadsfri om inga avvikelser påvisas.
                          </li>
                          <li>
                            Avtalet avslutas automatiskt i samband med att CompCare sänder slutrapport
                            till kunden.
                          </li>
                          <li>
                            CompCare har tystnadsplikt avseende alla uppgifter som mottas inom ramen
                            för uppdraget.
                          </li>
                          <li>
                            Uppladdade dokument behandlas i enlighet med GDPR och raderas efter
                            avslutad granskning.
                          </li>
                        </ol>

                        <p className="text-xs text-muted-foreground italic">
                          Genom att kryssa i rutan godkänner du villkoren ovan. Tidpunkten för ditt
                          godkännande registreras.
                        </p>
                      </div>
                    </ScrollArea>
                    <div className="pt-2">
                      <a
                        href="/compcare_granskningsavtal.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Ladda ner avtal (PDF)
                      </a>
                    </div>
                  </DialogContent>
                </Dialog>
              </span>
            </label>
          </div>

          <Button
            size="default"
            className="text-sm font-semibold px-6 py-3"
            disabled={!canSubmit || uploading}
            onClick={handleSubmit}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Laddar upp...
              </>
            ) : (
              "Skicka in för granskning"
            )}
          </Button>
        </div>
      )}

      {/* Steps 2/3/4 intentionally removed — user is never shown extraction/analysis progress or results. */}
      {/* ── STEP 5: Thank you ──────────────────────────────────────────── */}
      {step === 5 && (
        <div className="text-center space-y-6 py-12">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Tack!</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Vi har tagit emot dina dokument. Din tidrapport granskas — vi återkommer vanligtvis inom 2 arbetsdagar.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/consultant/fakturakontroll")}>
            Tillbaka till faktureringsstöd
          </Button>
        </div>
      )}
    </div>
  );
}

function parseTime(t: string): number {
  const [h, m] = (t ?? "0:0").split(":").map(Number);
  return (h || 0) + (m || 0) / 60;
}
