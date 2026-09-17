import { useEffect, useRef, useState } from "react";
import { Bell, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recordBetaEvent, validateBetaEmail } from "@/lib/beta/client";
import type { BetaAnalysisResult } from "@/lib/beta/types";
import { BetaFootnote } from "./BetaResultStep";

export function BetaCoachStep({ result, onReset }: { result: BetaAnalysisResult; onReset: () => void }) {
  const [tone, setTone] = useState<"soft" | "sharp">("soft");
  const [draft, setDraft] = useState(result.counter_offers.soft);
  const [leadOpen, setLeadOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saveEmail, setSaveEmail] = useState(true);
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const showOptIn = result.calc.tier !== "green";

  useEffect(() => {
    setDraft(tone === "soft" ? result.counter_offers.soft : result.counter_offers.sharp);
  }, [result.counter_offers.sharp, result.counter_offers.soft, tone]);

  async function copyCounter() {
    try {
      await navigator.clipboard.writeText(draft);
      toast.success("Kopierat");
    } catch {
      toast.error("Motbudet kunde inte kopieras");
      return;
    }
    if (result.analysis_id) {
      try {
        await recordBetaEvent({ analysisId: result.analysis_id, event: "copied" });
      } catch {
        // Kopieringen lyckades även om den anonyma händelsen inte kunde registreras.
      }
    }
  }

  function openLead() {
    setLeadOpen(true);
    window.requestAnimationFrame(() => leadRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  async function saveLead(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!result.analysis_id) {
      setError("Analysen kunde inte kopplas till sparningen. Granska avtalet igen.");
      return;
    }
    try {
      const validatedEmail = validateBetaEmail(email);
      if (!saveEmail && !optIn) {
        setError("Välj minst ett alternativ för att spara.");
        return;
      }
      setSaving(true);
      if (saveEmail) {
        await recordBetaEvent({ analysisId: result.analysis_id, event: "save_email", email: validatedEmail });
      }
      if (showOptIn && optIn) {
        await recordBetaEvent({ analysisId: result.analysis_id, event: "lead_opt_in", email: validatedEmail });
      }
      setSaved(true);
    } catch (err) {
      if (err instanceof z.ZodError) setError(err.issues[0]?.message ?? "Ange en giltig e-postadress.");
      else setError(err instanceof Error ? err.message : "Det gick inte att spara. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Förhandlingscoach</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Ditt motbud – färdigt att skicka</h1>
      </div>

      <Card className="p-5 sm:p-7">
        <div className="mb-5 flex w-fit rounded-md bg-muted p-1" role="group" aria-label="Ton i motbudet">
          <button
            type="button"
            onClick={() => setTone("soft")}
            aria-pressed={tone === "soft"}
            className={`min-h-9 rounded-sm px-4 text-sm font-medium transition-colors ${tone === "soft" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            Mjukare
          </button>
          <button
            type="button"
            onClick={() => setTone("sharp")}
            aria-pressed={tone === "sharp"}
            className={`min-h-9 rounded-sm px-4 text-sm font-medium transition-colors ${tone === "sharp" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            Skarpare
          </button>
        </div>

        <Label htmlFor="beta-counter">Motbud</Label>
        <Textarea
          id="beta-counter"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={12}
          maxLength={4_000}
          className="mt-2 min-h-72 resize-y font-sans leading-7"
        />
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Föreslagen ersättning: <strong className="font-medium text-foreground">{result.calc.counter_target_rate} kr/h</strong>{" "}
          (motsvarar ~18 % marginal för byrån)
          {result.extracted.compensation_type === "Anställd" && (
            <> · i dina villkor: <strong className="font-medium text-foreground">{result.calc.counter_target_rate_user_terms} kr/h</strong></>
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={copyCounter}><Copy aria-hidden="true" /> Kopiera motbud</Button>
          <Button type="button" variant="outline" onClick={openLead}><Bell aria-hidden="true" /> Bevaka framtida uppdrag</Button>
        </div>
      </Card>

      {leadOpen && (
        <Card ref={leadRef} className="p-5 sm:p-7">
          {saved ? (
            <div className="flex items-start gap-3" role="status">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check aria-hidden="true" /></span>
              <div>
                <h2 className="text-lg font-semibold">Sparat. Vi hör av oss.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Analysen sparas till din e-postadress.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={saveLead}>
              <h2 className="text-xl font-semibold">Spara analysen och få uppdrag som betalar rätt</h2>
              <div className="mt-5 max-w-md space-y-2">
                <Label htmlFor="beta-email">E-postadress</Label>
                <Input id="beta-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={255} required />
              </div>
              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox id="beta-save-email" checked={saveEmail} onCheckedChange={(checked) => setSaveEmail(checked === true)} />
                  <Label htmlFor="beta-save-email" className="pt-0.5 leading-5">Skicka analysen till min e-post</Label>
                </div>
                {showOptIn && (
                  <div className="flex items-start gap-3">
                    <Checkbox id="beta-opt-in" checked={optIn} onCheckedChange={(checked) => setOptIn(checked === true)} />
                    <Label htmlFor="beta-opt-in" className="pt-0.5 leading-5">Jag vill bli kontaktad av bemanningsbolag som betalar i nivå med takpriset</Label>
                  </div>
                )}
              </div>
              {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
              <Button type="submit" className="mt-5" disabled={saving}>{saving ? "Sparar…" : "Spara"}</Button>
            </form>
          )}
        </Card>
      )}

      <div className="flex justify-center">
        <Button type="button" variant="ghost" onClick={onReset}>Granska ett annat avtal</Button>
      </div>
      <BetaFootnote />
    </div>
  );
}
