import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, GitCompareArrows, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { listCvDrafts, getCvDraft, type CvDraftListItem } from "@/lib/cvAssistant.history.functions";
import { downloadCvAsDocx, downloadCvAsPdf, cvFileName } from "@/lib/cvExport";

const STATUS_LABELS: Record<string, string> = {
  ready: "Klar",
  needs_input: "Väntar på svar",
  draft: "Utkast",
};

type DiffRow = { type: "same" | "add" | "del"; text: string };

/** Radbaserad LCS-diff — tillräcklig för CV-utkast (< några hundra rader). */
function diffLines(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      rows.push({ type: "same", text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      rows.push({ type: "del", text: a[i]! });
      i++;
    } else {
      rows.push({ type: "add", text: b[j]! });
      j++;
    }
  }
  while (i < m) rows.push({ type: "del", text: a[i++]! });
  while (j < n) rows.push({ type: "add", text: b[j++]! });
  return rows;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  /** Ökas av föräldern efter varje körning så listan laddas om. */
  refreshKey: number;
  /** Öppnar ett utkast i huvudvyn (fortsatt iteration sker på det utkastet). */
  onOpen: (draft: {
    id: string;
    version: number;
    cv_markdown: string | null;
    summary: string | null;
    strengths: unknown;
    questions: unknown;
  }) => void;
}

/** Versionshistorik: lista, öppna, jämför de två senaste, ladda ner äldre versioner. */
export default function CvHistoryList({ refreshKey, onOpen }: Props) {
  const runList = useServerFn(listCvDrafts);
  const runGet = useServerFn(getCvDraft);
  const [drafts, setDrafts] = useState<CvDraftListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [diff, setDiff] = useState<DiffRow[] | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await runList({});
      setDrafts(res.drafts);
    } catch {
      // Tyst — historiken är sekundär och ska inte störa huvudflödet.
    } finally {
      setLoading(false);
    }
  }, [runList]);

  useEffect(() => {
    if (expanded) void load();
  }, [expanded, refreshKey, load]);

  const fetchMarkdown = useCallback(
    async (id: string): Promise<string | null> => {
      const res = await runGet({ data: { id } });
      return res.draft.cv_markdown ?? null;
    },
    [runGet],
  );

  async function withDraft(id: string, action: (markdown: string) => void | Promise<void>) {
    setBusyId(id);
    try {
      const markdown = await fetchMarkdown(id);
      if (!markdown) {
        toast.error("Versionen saknar innehåll.");
        return;
      }
      await action(markdown);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte hämta versionen.");
    } finally {
      setBusyId(null);
    }
  }

  async function openDraft(id: string) {
    setBusyId(id);
    try {
      const res = await runGet({ data: { id } });
      onOpen(res.draft);
      setDiff(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte öppna versionen.");
    } finally {
      setBusyId(null);
    }
  }

  async function compareLatestTwo() {
    if (drafts.length < 2) return;
    setDiffLoading(true);
    try {
      const [newer, older] = await Promise.all([
        fetchMarkdown(drafts[0]!.id),
        fetchMarkdown(drafts[1]!.id),
      ]);
      if (!newer || !older) {
        toast.error("Kunde inte jämföra versionerna.");
        return;
      }
      setDiff(diffLines(older, newer));
    } catch {
      toast.error("Kunde inte jämföra versionerna.");
    } finally {
      setDiffLoading(false);
    }
  }

  const changedCount = useMemo(
    () => (diff ? diff.filter((r) => r.type !== "same").length : 0),
    [diff],
  );

  return (
    <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Tidigare versioner</p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10"
        >
          {expanded ? "Dölj" : "Visa"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <p className="flex items-center gap-2 text-xs text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Hämtar historik …
            </p>
          ) : drafts.length === 0 ? (
            <p className="text-xs text-white/45">Inga tidigare utkast ännu.</p>
          ) : (
            <>
              <ul className="divide-y divide-white/5">
                {drafts.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-white/40" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white/80">
                        {formatDate(d.updated_at)} · version {d.version} ·{" "}
                        {STATUS_LABELS[d.status] ?? d.status}
                      </p>
                      {d.source_file_name && (
                        <p className="truncate text-[11px] text-white/40">
                          Källa: {d.source_file_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => void openDraft(d.id)}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                      >
                        Öppna
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => void withDraft(d.id, (md) => downloadCvAsDocx(md, cvFileName(md, "docx")))}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                      >
                        DOCX
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => void withDraft(d.id, (md) => downloadCvAsPdf(md, cvFileName(md, "pdf")))}
                        className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                      >
                        PDF
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {drafts.length >= 2 && (
                <button
                  type="button"
                  disabled={diffLoading}
                  onClick={() => (diff ? setDiff(null) : void compareLatestTwo())}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 disabled:opacity-50"
                >
                  {diffLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <GitCompareArrows className="h-3.5 w-3.5" />
                  )}
                  {diff ? "Dölj jämförelse" : "Jämför de två senaste"}
                </button>
              )}

              {diff && (
                <div className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3">
                  <p className="mb-2 text-[11px] text-white/45">
                    {changedCount === 0
                      ? "Inga skillnader mellan de två senaste versionerna."
                      : `${changedCount} ändrade rader. Grönt = tillagt, rött = borttaget.`}
                  </p>
                  <pre className="whitespace-pre-wrap text-[11px] leading-relaxed">
                    {diff.map((row, idx) =>
                      row.type === "same" ? (
                        <span key={idx} className="block text-white/40">
                          {row.text || " "}
                        </span>
                      ) : row.type === "add" ? (
                        <span key={idx} className="block bg-emerald-500/10 text-emerald-300/90">
                          + {row.text}
                        </span>
                      ) : (
                        <span key={idx} className="block bg-red-500/10 text-red-300/80">
                          − {row.text}
                        </span>
                      ),
                    )}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
