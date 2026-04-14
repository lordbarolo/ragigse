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
  "Legitimerad sjuksköterska",
  "Specialistsjuksköterska",
  "Anestesisjuksköterska",
  "Intensivvårdssjuksköterska",
  "Operationssjuksköterska",
  "Röntgensjuksköterska",
  "Distriktssjuksköterska",
  "Barnmorska",
  "Legitimerad läkare",
  "Specialist läkare",
  "Anestesiolog",
  "Intensivvårdsläkare",
  "Psykiater",
  "Rättspsykiater",
];

const FILE_LABELS: Record<FileSlot, { label: string; desc: string }> = {
  faktura: { label: "Faktura", desc: "Din faktura till regionen" },
  tidrapport: { label: "Tidrapport", desc: "Signerad tidrapport" },
};

const STEP_LABELS = [
  { n: 1, label: "Ladda upp" },
  { n: 2, label: "Analys" },
  { n: 3, label: "Sammanfattning" },
  { n: 4, label: "Bekräftelse" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function FakturakontrollNy() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(slot, file);
    },
    [handleFileSelect],
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
    if (!user || !canSubmit) return;
    setUploading(true);

    try {
      const userId = user.id;
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
      setStep(2);

      // Trigger extraction
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const extractRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/invoice-extract`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ review_id: review.id }),
        },
      );

      if (!extractRes.ok) {
        const errBody = await extractRes.text();
        throw new Error(`Extraction failed: ${errBody}`);
      }

      const result = await extractRes.json();
      setExtractionResult(result);
      setStep(3);
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

  // ── Auth gate ────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Logga in för att använda fakturagranskning</h1>
        <Button onClick={() => navigate("/logga-in")}>Logga in</Button>
      </div>
    );
  }

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
                Vi granskar dina fakturor och tidrapporter utan kostnad. Hittar vi avvikelser tar vi
                25 % av identifierat belopp. Hittas inget — kostar det inget.
              </p>
            </div>
          </div>

          <hr className="border-border" />

          <h2 className="text-sm font-semibold tracking-tight">Ladda upp dina dokument</h2>

          {/* File uploads */}
          <div className="space-y-3">
            {(["faktura", "tidrapport"] as FileSlot[]).map((slot) => {
              const uploaded = files[slot];
              const meta = FILE_LABELS[slot];
              return (
                <label
                  key={slot}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    uploaded
                      ? "border-primary/40 bg-primary/[0.03]"
                      : "border-border hover:border-primary/30"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(slot, e)}
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
                      uploaded ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    {uploaded ? (
                      <FileCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {uploaded ? uploaded.name : meta.desc}
                    </p>
                  </div>
                  {uploaded && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                </label>
              );
            })}
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
                          <strong>Tjänsteleverantör:</strong> CompCare AB (org.nr XXXXXX-XXXX), nedan "CompCare"
                          <br />
                          <strong>Kund:</strong> {user?.email ?? "[kundens e-postadress]"}
                        </p>

                        <ol className="list-decimal pl-5 space-y-2 text-sm">
                          <li>
                            Kunden ger CompCare rätt att granska insända fakturor och tidrapporter mot
                            gällande ramavtalspriser och arbetsscheman.
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

      {/* ── STEP 2: Extracting ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="text-center space-y-6 py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Analyserar dina dokument</h2>
            <p className="text-muted-foreground text-sm">
              Våra AI-assistenter läser igenom faktura och tidrapport. Det tar vanligtvis 20–40
              sekunder.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 3: Summary + confirm ──────────────────────────────────── */}
      {step === 3 && extractionResult && (
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Sammanfattning</h2>
            <p className="text-muted-foreground text-sm">
              Granska att uppgifterna nedan stämmer och bekräfta.
            </p>
          </div>

          {(() => {
            const summary = getSummary();
            const confidence = extractionResult.confidence;
            const hasLowConfidence = confidence.overall < 1.0;
            const lowRows = confidence.rows.filter((r) => !r.match);

            return (
              <>
                {/* Summary cards */}
                {summary && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{summary.antalPass}</p>
                      <p className="text-xs text-muted-foreground">pass</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{summary.totalTimmar}</p>
                      <p className="text-xs text-muted-foreground">timmar</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-2xl font-bold">{summary.nattpass}</p>
                      <p className="text-xs text-muted-foreground">nattpass</p>
                    </div>
                  </div>
                )}

                {/* Low confidence warning */}
                {hasLowConfidence && (
                  <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">
                        {lowRows.length} rad{lowRows.length > 1 ? "er" : ""} kunde inte verifieras
                        automatiskt
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Visa detaljer nedan för att kontrollera.
                      </p>
                    </div>
                  </div>
                )}

                {/* Details toggle */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-primary hover:underline"
                >
                  {showDetails ? "Dölj detaljer" : "Visa detaljer"}
                </button>

                {showDetails && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded-lg overflow-hidden">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium">Datum</th>
                          <th className="text-left p-2 font-medium">Start</th>
                          <th className="text-left p-2 font-medium">Slut</th>
                          <th className="text-left p-2 font-medium">Rast</th>
                          <th className="text-left p-2 font-medium">Typ</th>
                          <th className="p-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {((extractionResult.tidrapport as any)?.rader ?? []).map(
                          (rad: any, i: number) => {
                            const rowConf = confidence.rows.find((r) => r.index === i);
                            const isLow = rowConf && !rowConf.match;
                            return (
                              <tr
                                key={i}
                                className={isLow ? "bg-yellow-500/10" : ""}
                              >
                                <td className="p-2">{rad.datum}</td>
                                <td className="p-2">{rad.start_tid}</td>
                                <td className="p-2">{rad.slut_tid}</td>
                                <td className="p-2">{rad.rast_minuter}m</td>
                                <td className="p-2">{rad.typ}</td>
                                <td className="p-2">
                                  {isLow ? (
                                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-primary" />
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button size="default" className="text-sm font-semibold px-6 py-3" onClick={handleConfirm}>
                  Bekräfta och analysera
                </Button>
              </>
            );
          })()}
        </div>
      )}

      {/* ── STEP 4: Analyzing ──────────────────────────────────────────── */}
      {step === 4 && (
        <div className="text-center space-y-6 py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Kör analys</h2>
            <p className="text-muted-foreground text-sm">
              Jämför faktura med tidrapport och dina avtalade priser...
            </p>
          </div>
        </div>
      )}

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
            Tillbaka till fakturakontroll
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
