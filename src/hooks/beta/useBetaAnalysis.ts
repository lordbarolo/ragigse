import { useEffect, useRef, useState } from "react";
import { analyzeBetaContract, BetaApiError, fileToBase64 } from "@/lib/beta/client";
import type { BetaAnalysisInput, BetaAnalysisResult, BetaExtractedContract, BetaManualOverride } from "@/lib/beta/types";

export function useBetaAnalysis() {
  const [busy, setBusy] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<Partial<BetaExtractedContract> | null>(null);
  const [result, setResult] = useState<BetaAnalysisResult | null>(null);
  const sourceRef = useRef<Omit<BetaAnalysisInput, "manual_override"> | null>(null);

  useEffect(() => {
    if (!busy) return;
    setStatusIndex(0);
    const interval = window.setInterval(() => {
      setStatusIndex((current) => Math.min(3, current + 1));
    }, 1500);
    return () => window.clearInterval(interval);
  }, [busy]);

  async function execute(input: BetaAnalysisInput) {
    setBusy(true);
    setError(null);
    try {
      const next = await analyzeBetaContract(input);
      setResult(next);
      setMissing(null);
      return next;
    } catch (err) {
      if (err instanceof BetaApiError && err.status === 422) {
        setMissing(err.extracted ?? {});
      } else {
        setError(err instanceof Error ? err.message : "Analysen kunde inte genomföras.");
      }
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function analyze(input: { file?: File; text?: string }) {
    const payload: Omit<BetaAnalysisInput, "manual_override"> = input.file
      ? { file_base64: await fileToBase64(input.file), mime_type: input.file.type }
      : { text: input.text };
    sourceRef.current = payload;
    return execute(payload);
  }

  async function resubmit(manualOverride: BetaManualOverride) {
    if (!sourceRef.current) {
      setError("Underlaget saknas. Ladda upp avtalet igen.");
      return null;
    }
    return execute({ ...sourceRef.current, manual_override: manualOverride });
  }

  function reset() {
    sourceRef.current = null;
    setBusy(false);
    setStatusIndex(0);
    setError(null);
    setMissing(null);
    setResult(null);
  }

  return { busy, statusIndex, error, missing, result, analyze, resubmit, reset, setMissing };
}
