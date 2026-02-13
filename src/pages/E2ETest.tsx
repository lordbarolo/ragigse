import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Play } from "lucide-react";

interface TestStep {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  details: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface TestResult {
  summary: { total: number; passed: number; failed: number };
  steps: TestStep[];
  test_email: string;
}

export default function E2ETest() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("e2e-test", {
        body: {},
      });

      if (fnError) throw fnError;
      setResult(data as TestResult);
      console.log("[E2E Test Results]", data);
    } catch (e: any) {
      setError(e.message || "Unknown error");
      console.error("[E2E Test Error]", e);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">🧪 E2E Test Harness</h1>
        <Button onClick={runTests} disabled={running} size="lg">
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
          {running ? "Kör tester..." : "Kör alla tester"}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-destructive font-mono text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Resultat: {result.summary.passed}/{result.summary.total} PASS
                {result.summary.failed > 0 && (
                  <span className="text-destructive ml-2">({result.summary.failed} FAIL)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Test-email: {result.test_email}</p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {result.steps.map((step, i) => (
              <Card key={i} className={step.status === "FAIL" ? "border-destructive/50" : "border-accent/30"}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {step.status === "PASS" ? (
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    <span className="font-semibold text-foreground">{step.name}</span>
                    <span
                      className={`ml-auto text-xs font-mono px-2 py-0.5 rounded ${
                        step.status === "PASS"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{step.details}</p>
                  {(step.before || step.after) && (
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      {step.before && (
                        <div className="bg-muted rounded p-2">
                          <span className="text-muted-foreground block mb-1">Before:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(step.before, null, 2)}</pre>
                        </div>
                      )}
                      {step.after && (
                        <div className="bg-muted rounded p-2">
                          <span className="text-muted-foreground block mb-1">After:</span>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(step.after, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {!result && !running && (
        <p className="text-muted-foreground text-center py-12">
          Klicka "Kör alla tester" för att starta E2E-verifieringen.
        </p>
      )}
    </div>
  );
}
