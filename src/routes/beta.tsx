import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import CompcareLogo from "@/components/CompcareLogo";
import { Card } from "@/components/ui/card";
import { BetaCoachStep } from "@/components/beta/BetaCoachStep";
import { BetaManualForm } from "@/components/beta/BetaManualForm";
import { BetaResultStep } from "@/components/beta/BetaResultStep";
import { BetaStepIndicator } from "@/components/beta/BetaStepIndicator";
import { BetaUploadStep } from "@/components/beta/BetaUploadStep";
import { useBetaAnalysis } from "@/hooks/beta/useBetaAnalysis";

export const Route = createFileRoute("/beta")({
  head: () => ({
    meta: [
      { title: "AI-avtalsgranskare — vårdbemanning.ai" },
      {
        name: "description",
        content: "Granska ett bemanningsavtal mot SKR:s ramavtalstak och skapa ett sakligt motbud.",
      },
      { property: "og:title", content: "AI-avtalsgranskare — vårdbemanning.ai" },
      {
        property: "og:description",
        content: "Granska ett bemanningsavtal mot SKR:s ramavtalstak och skapa ett sakligt motbud.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BetaPage,
});

function BetaPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adjusting, setAdjusting] = useState(false);
  const analysis = useBetaAnalysis();

  async function submit(input: { file?: File; text?: string }) {
    const next = await analysis.analyze(input);
    if (next) setStep(2);
  }

  async function applyManual(value: Parameters<typeof analysis.resubmit>[0]) {
    const next = await analysis.resubmit(value);
    if (next) {
      setAdjusting(false);
      setStep(2);
    }
  }

  function reset() {
    analysis.reset();
    setAdjusting(false);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <CompcareLogo variant="wordmark" inverted />
          <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">Beta</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <BetaStepIndicator current={step} />
        <div className="mt-10 sm:mt-14">
          {step === 1 && !analysis.missing && (
            <BetaUploadStep busy={analysis.busy} statusIndex={analysis.statusIndex} error={analysis.error} onAnalyze={submit} />
          )}

          {step === 1 && analysis.missing && (
            <Card className="mx-auto max-w-2xl p-5 sm:p-7">
              <BetaManualForm initial={analysis.missing} busy={analysis.busy} onSubmit={applyManual} onCancel={() => analysis.setMissing(null)} />
              {analysis.error && <p role="alert" className="mt-4 text-sm text-destructive">{analysis.error}</p>}
            </Card>
          )}

          {step === 2 && analysis.result && !adjusting && (
            <BetaResultStep
              result={analysis.result}
              onAdjust={() => setAdjusting(true)}
              onCounter={() => { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              onReset={reset}
            />
          )}

          {step === 2 && analysis.result && adjusting && (
            <Card className="mx-auto max-w-2xl p-5 sm:p-7">
              <BetaManualForm initial={analysis.result.extracted} busy={analysis.busy} onSubmit={applyManual} onCancel={() => setAdjusting(false)} />
              {analysis.error && <p role="alert" className="mt-4 text-sm text-destructive">{analysis.error}</p>}
            </Card>
          )}

          {step === 3 && analysis.result && <BetaCoachStep result={analysis.result} onReset={reset} />}
        </div>
      </main>
    </div>
  );
}
