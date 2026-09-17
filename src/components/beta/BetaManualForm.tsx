import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateManualOverride } from "@/lib/beta/client";
import type {
  BetaCompensationType,
  BetaExtractedContract,
  BetaManualOverride,
  BetaProfession,
} from "@/lib/beta/types";

interface BetaManualFormProps {
  initial?: Partial<BetaExtractedContract>;
  busy: boolean;
  onCancel?: () => void;
  onSubmit: (value: BetaManualOverride) => void;
}

export function BetaManualForm({ initial, busy, onCancel, onSubmit }: BetaManualFormProps) {
  const [profession, setProfession] = useState<BetaProfession>(initial?.profession ?? "Läkare");
  const [specialty, setSpecialty] = useState(initial?.specialty ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [compensationType, setCompensationType] = useState<BetaCompensationType>(
    initial?.compensation_type ?? "Faktura",
  );
  const initialRate = initial?.offered_rate
    ? initial.compensation_type === "Anställd"
      ? initial.offered_rate * 165
      : initial.offered_rate
    : null;
  const [rate, setRate] = useState(initialRate ? String(Math.round(initialRate)) : "");
  const [error, setError] = useState<string | null>(null);
  const monthly = compensationType === "Anställd";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const entered = Number(rate.replace(",", "."));
      const hourlyRate = monthly ? entered / 165 : entered;
      const value = validateManualOverride({
        profession,
        specialty,
        region,
        compensation_type: compensationType,
        offered_rate: hourlyRate,
      });
      onSubmit(value);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message ?? "Kontrollera uppgifterna.");
      } else {
        setError("Kontrollera uppgifterna.");
      }
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Fyll i det som saknas">
      <div>
        <h2 className="text-lg font-semibold">Fyll i det som saknas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Kontrollera uppgifterna innan analysen räknas om.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="beta-profession">Yrke</Label>
          <Select value={profession} onValueChange={(value) => setProfession(value as BetaProfession)}>
            <SelectTrigger id="beta-profession"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Läkare">Läkare</SelectItem>
              <SelectItem value="Sjuksköterska">Sjuksköterska</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="beta-specialty">Specialitet</Label>
          <Input id="beta-specialty" value={specialty} onChange={(event) => setSpecialty(event.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beta-region">Region eller ort</Label>
          <Input id="beta-region" value={region} onChange={(event) => setRegion(event.target.value)} maxLength={120} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="beta-compensation">Ersättningstyp</Label>
          <Select value={compensationType} onValueChange={(value) => setCompensationType(value as BetaCompensationType)}>
            <SelectTrigger id="beta-compensation"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AB">AB</SelectItem>
              <SelectItem value="Faktura">Faktura</SelectItem>
              <SelectItem value="Anställd">Anställd</SelectItem>
              <SelectItem value="Okänt">Okänt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="max-w-sm space-y-2">
        <Label htmlFor="beta-rate">Erbjuden ersättning ({monthly ? "kr/mån" : "kr/h"})</Label>
        <Input
          id="beta-rate"
          inputMode="decimal"
          value={rate}
          onChange={(event) => setRate(event.target.value)}
          min="1"
          max="10000000"
          type="number"
          required
        />
        {monthly && <p className="text-xs text-muted-foreground">Månadslönen räknas om med 165 timmar per månad.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>{busy ? "Räknar om…" : "Räkna om"}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>Avbryt</Button>}
      </div>
    </form>
  );
}
