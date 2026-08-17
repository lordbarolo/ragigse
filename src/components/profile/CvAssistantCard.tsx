import { useEffect, useMemo, useState } from "react";
import { Copy, Download, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { optimizeCv } from "@/lib/cvAssistant.functions";
import { listCvTemplates } from "@/lib/cvTemplates.functions";
import {
  DEFAULT_CV_TEMPLATE_SLUG,
  FALLBACK_CV_TEMPLATES,
  findTemplate,
} from "@/lib/cvTemplates";
import { downloadCvAsDocx, downloadCvAsPdf, cvFileName } from "@/lib/cvExport";
import { useAuth } from "@/hooks/useAuth";
import CvPreview from "./CvPreview";
import CvTemplatePicker from "./CvTemplatePicker";
import CvHistoryList from "./CvHistoryList";

type Question = { id: string; question: string; why?: string };

type SourceInfo = {
  type: "uploaded_cv" | "selected_document" | "pasted_text" | "previous_draft";
  fileName: string | null;
};

type DocOption = { id: string; doc_type: string; file_name: string };

const DOC_LABELS: Record<string, string> = {
  cv: "Uppladdat CV",
  legitimation: "Legitimation",
  hosp: "HOSP-utdrag",
  ivo: "IVO-utdrag",
  belastningsregister: "Belastningsregisterutdrag",
};

const PASTED = "__pasted__";

function sourceDescription(source: SourceInfo): string {
  switch (source.type) {
    case "uploaded_cv":
      return `Källa: ditt uppladdade CV${source.fileName ? ` (${source.fileName})` : ""}.`;
    case "selected_document":
      return `Källa: valt dokument${source.fileName ? ` (${source.fileName})` : ""}.`;
    case "pasted_text":
      return "Källa: inklistrad text.";
    case "previous_draft":
      return "Uppdatering av tidigare utkast.";
  }
}

/** CV-assistent: tar konsultens uppladdade/inklistrade CV och bygger en proffsversion. */
export default function CvAssistantCard() {
  const { user } = useAuth();
  const fullName = (user?.user_metadata?.full_name as string | undefined) ?? null;
  const runOptimize = useServerFn(optimizeCv);
  const [docs, setDocs] = useState<DocOption[]>([]);
  const [sourceChoice, setSourceChoice] = useState<string>(PASTED);
  const [cvText, setCvText] = useState("");
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draftId, setDraftId] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [sourceInfo, setSourceInfo] = useState<SourceInfo | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  // Användarens uppladdade dokument (RLS-skyddad läsning) till källvalet.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("consultant_documents")
        .select("id, doc_type, file_name")
        .order("doc_type");
      if (cancelled || error || !data) return;
      setDocs(data);
      const cvDoc = data.find((d) => d.doc_type === "cv");
      if (cvDoc) setSourceChoice(cvDoc.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const iterating = Boolean(draftId && markdown);

  const sourceOptions = useMemo(
    () => [
      ...docs.map((d) => ({
        value: d.id,
        label: `${DOC_LABELS[d.doc_type] ?? d.doc_type} — ${d.file_name}`,
      })),
      { value: PASTED, label: "Inklistrad text nedan" },
    ],
    [docs],
  );

  async function run() {
    setLoading(true);
    try {
      const usePastedText = sourceChoice === PASTED;
      const res = await runOptimize({
        data: {
          cvText: cvText.trim() || undefined,
          answers: Object.keys(answers).length > 0 ? answers : undefined,
          instruction: instruction.trim() || undefined,
          draftId: draftId ?? undefined,
          sourceDocumentId: !usePastedText ? sourceChoice : undefined,
          usePastedText: usePastedText || undefined,
        },
      });
      setMarkdown(res.cvMarkdown);
      setSummary(res.summary);
      setStrengths(res.strengths ?? []);
      setQuestions((res.questions ?? []) as Question[]);
      setDraftId(res.id);
      setVersion(res.version);
      setSourceInfo(res.source as SourceInfo);
      setAnswers({});
      setInstruction("");
      setHistoryRefresh((n) => n + 1);
      toast.success(
        res.source.type === "previous_draft"
          ? "Utkastet är uppdaterat."
          : "Assistenten har bearbetat ditt CV.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMarkdown("");
    setSummary("");
    setStrengths([]);
    setQuestions([]);
    setAnswers({});
    setInstruction("");
    setDraftId(null);
    setVersion(null);
    setSourceInfo(null);
  }

  function openFromHistory(draft: {
    id: string;
    version: number;
    cv_markdown: string | null;
    summary: string | null;
    strengths: unknown;
    questions: unknown;
  }) {
    setDraftId(draft.id);
    setVersion(draft.version);
    setMarkdown(draft.cv_markdown ?? "");
    setSummary(draft.summary ?? "");
    setStrengths(Array.isArray(draft.strengths) ? (draft.strengths as string[]) : []);
    setQuestions(Array.isArray(draft.questions) ? (draft.questions as Question[]) : []);
    setAnswers({});
    setSourceInfo(null);
    toast.success("Versionen är öppnad. Fortsätt arbeta på den eller ladda ner.");
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(markdown);
    toast.success("CV:t är kopierat.");
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cvFileName(markdown, "md", fullName);
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

      {!iterating && (
        <>
          <label className="mt-5 block text-xs text-white/45" htmlFor="cv-source">
            Underlag
          </label>
          <select
            id="cv-source"
            value={sourceChoice}
            onChange={(e) => setSourceChoice(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white focus:border-white/25 focus:outline-none [&>option]:bg-[#121319]"
          >
            {sourceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {sourceChoice === PASTED && (
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              rows={4}
              placeholder="Klistra in innehållet i ditt CV här."
              className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
            />
          )}
        </>
      )}

      <label className="mt-4 block text-xs text-white/45" htmlFor="cv-instruction">
        Instruktion till assistenten (valfritt)
      </label>
      <input
        id="cv-instruction"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        maxLength={1000}
        placeholder="T.ex. betona IVA-erfarenhet"
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/25 focus:outline-none"
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {iterating ? "Uppdatera CV:t" : "Förbättra mitt CV"}
        </button>
        {iterating && (
          <button
            type="button"
            onClick={reset}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Börja om från källan
          </button>
        )}
      </div>

      {sourceInfo && (
        <p className="mt-3 text-xs text-white/45">
          {sourceDescription(sourceInfo)}
          {version && version > 1 ? ` Version ${version}.` : ""}
        </p>
      )}

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
            Svara och tryck på ”Uppdatera CV:t” — assistenten väver in uppgifterna i samma utkast.
          </p>
        </div>
      )}

      {markdown && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void downloadCvAsDocx(markdown, cvFileName(markdown, "docx", fullName)).catch(() =>
                  toast.error("Kunde inte skapa DOCX-filen. Försök igen."),
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0b0c10] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Ladda ner DOCX
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  downloadCvAsPdf(markdown, cvFileName(markdown, "pdf", fullName));
                } catch {
                  toast.error("Kunde inte skapa PDF-filen. Försök igen.");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0b0c10] hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" /> Ladda ner PDF
            </button>
            <button
              type="button"
              onClick={copyMarkdown}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              <Copy className="h-3.5 w-3.5" /> Kopiera
            </button>
            <button
              type="button"
              onClick={downloadMarkdown}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
            >
              <FileText className="h-3.5 w-3.5" /> Markdown
            </button>
          </div>
          <CvPreview markdown={markdown} className="mt-4" />
        </div>
      )}

      <CvHistoryList refreshKey={historyRefresh} onOpen={openFromHistory} />
    </div>
  );
}
