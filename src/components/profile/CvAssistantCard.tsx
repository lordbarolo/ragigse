import { useState } from "react";
import { Loader2, Sparkles, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { optimizeCv } from "@/lib/cvAssistant.functions";

type Question = { id: string; question: string; why?: string };

/** CV-assistent: tar konsultens uppladdade/inklistrade CV och bygger en proffsversion. */
export default function CvAssistantCard() {
  const runOptimize = useServerFn(optimizeCv);
  const [cvText, setCvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  async function run() {
    setLoading(true);
    try {
      const res = await runOptimize({
        data: {
          cvText: cvText.trim() || undefined,
          answers: Object.keys(answers).length > 0 ? answers : undefined,
        },
      });
      setMarkdown(res.cvMarkdown);
      setSummary(res.summary);
      setStrengths(res.strengths ?? []);
      setQuestions((res.questions ?? []) as Question[]);
      toast.success(
        res.usedUploadedFile ? "Assistenten har läst ditt uppladdade CV." : "Assistenten har bearbetat ditt CV.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv-vardbemanning.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121319] p-6">
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
        <Sparkles className="h-4 w-4 text-white" />
      </span>
      <h3 className="mt-4 text-lg font-medium text-white">Hjälp med ditt CV</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">
        Assistenten utgår från ditt uppladdade CV och bygger en version med tydlig struktur, rätt
        formulerade behörigheter och de uppgifter som regionerna efterfrågar i avrop. Saknas något
        ställer assistenten kompletterande frågor.
      </p>

      <textarea
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
        rows={4}
        placeholder="Har du inget CV uppladdat? Klistra in innehållet här."
        className="mt-5 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
      />

      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {markdown ? "Uppdatera CV:t" : "Förbättra mitt CV"}
      </button>

      {summary && <p className="mt-4 text-sm text-white/60">{summary}</p>}

      {strengths.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {strengths.map((s) => (
            <li key={s} className="text-xs text-white/50">
              • {s}
            </li>
          ))}
        </ul>
      )}

      {questions.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Komplettera</p>
          <div className="mt-3 space-y-3">
            {questions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm text-white/80">{q.question}</label>
                {q.why && <p className="mt-0.5 text-xs text-white/40">{q.why}</p>}
                <input
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
                  placeholder="Ditt svar"
                />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-white/40">
            Svara och tryck på ”Uppdatera CV:t” — assistenten väver in uppgifterna.
          </p>
        </div>
      )}

      {markdown && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(markdown);
                toast.success("CV:t är kopierat.");
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" /> Kopiera
            </button>
            <button
              type="button"
              onClick={download}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              <Download className="h-3.5 w-3.5" /> Ladda ner
            </button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-white/75">
            {markdown}
          </pre>
        </div>
      )}
    </div>
  );
}
