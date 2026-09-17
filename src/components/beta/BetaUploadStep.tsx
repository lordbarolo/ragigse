import { useCallback, useRef, useState } from "react";
import { FileText, LockKeyhole, UploadCloud, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { validateBetaFile } from "@/lib/beta/client";

const STATUSES = [
  "Läser dokumentet…",
  "Maskerar personuppgifter…",
  "Slår upp SKR-takpris för regionen…",
  "Beräknar byråns marginal…",
] as const;

interface BetaUploadStepProps {
  busy: boolean;
  statusIndex: number;
  error: string | null;
  onAnalyze: (input: { file?: File; text?: string }) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function BetaUploadStep({ busy, statusIndex, error, onAnalyze }: BetaUploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const chooseFile = useCallback((candidate?: File) => {
    if (!candidate) return;
    const validationError = validateBetaFile(candidate);
    setFileError(validationError);
    setFile(validationError ? null : candidate);
  }, []);

  function submit() {
    if (mode === "file" && file) onAnalyze({ file });
    if (mode === "text" && text.trim()) onAnalyze({ text: text.trim() });
  }

  if (busy) {
    return (
      <Card className="mx-auto max-w-2xl overflow-hidden p-6 sm:p-8" aria-live="polite">
        <div className="space-y-7">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-4">
            {STATUSES.map((status, index) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    index < statusIndex ? "bg-success" : index === statusIndex ? "animate-pulse bg-primary" : "bg-muted"
                  }`}
                />
                <span className={index <= statusIndex ? "text-foreground" : "text-muted-foreground"}>{status}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${Math.min(92, 18 + statusIndex * 24)}%` }}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="text-balance text-3xl font-semibold leading-tight sm:text-5xl">
          Granska ditt bemanningsavtal på 5 sekunder med AI.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
          Ladda upp uppdragsbekräftelsen, offerten eller mejlet. Vi jämför ersättningen mot SKR:s
          ramavtalstak för regionen och visar vad byrån behåller.
        </p>
      </div>

      <Card className="overflow-hidden p-4 sm:p-6">
        <div className="mb-5 flex w-full rounded-md bg-muted p-1" role="tablist" aria-label="Välj underlag">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "file"}
            onClick={() => setMode("file")}
            className={`min-h-9 flex-1 rounded-sm px-3 text-sm font-medium transition-colors ${mode === "file" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            Ladda upp fil
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            onClick={() => setMode("text")}
            className={`min-h-9 flex-1 rounded-sm px-3 text-sm font-medium transition-colors ${mode === "text" ? "bg-background text-foreground" : "text-muted-foreground"}`}
          >
            Klistra in text i stället
          </button>
        </div>

        {mode === "file" ? (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
              }}
              onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files[0]);
              }}
              className={`flex min-h-64 w-full flex-col items-center justify-center rounded-md border border-dashed px-5 py-10 text-center transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${dragging ? "border-primary bg-accent" : "border-border bg-background/40 hover:border-primary/60"}`}
              aria-label="Ladda upp avtal"
            >
              <UploadCloud className="mb-4 h-9 w-9 text-muted-foreground" aria-hidden="true" />
              <span className="font-medium">Dra filen hit eller klicka för att välja</span>
              <span className="mt-2 text-sm text-muted-foreground">PDF, PNG, JPG eller WEBP · max 10 MB</span>
            </button>
            {file && (
              <div className="mt-3 flex items-center gap-3 rounded-md border border-border bg-background/50 p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Ta bort fil" onClick={() => setFile(null)}>
                  <X aria-hidden="true" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor="beta-contract-text" className="mb-2 block text-sm font-medium">Avtalstext eller mejl</label>
            <Textarea
              id="beta-contract-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              maxLength={50_000}
              rows={12}
              className="min-h-64 resize-y"
              placeholder="Klistra in underlaget här…"
            />
          </div>
        )}

        {(fileError || error) && <p role="alert" className="mt-4 text-sm text-destructive">{fileError || error}</p>}

        <div className="mt-5 rounded-md border border-border bg-muted/40 p-4">
          <div className="flex gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p className="text-sm leading-6 text-muted-foreground">
              <strong className="font-medium text-foreground">Ingen personidentifierbar data sparas.</strong>{" "}
              Namn, personnummer och kontaktuppgifter maskeras automatiskt innan analysen sparas – vi behåller
              endast yrke, region och ersättningsnivå för anonym marknadsstatistik.{" "}
              <Link to="/integritetspolicy" className="text-foreground underline underline-offset-4">Läs integritetspolicyn</Link>.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-center">
          <Button type="button" onClick={submit} disabled={(mode === "file" && !file) || (mode === "text" && !text.trim())}>
            Granska avtalet
          </Button>
        </div>
      </Card>
    </div>
  );
}
