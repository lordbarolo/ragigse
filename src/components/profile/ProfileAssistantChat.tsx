import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUp, Check, Loader2, Lock, Sparkle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import { basePrices, roleOptions5c, type RateRow } from "@/components/startsida5c/rate5c";
import { roleLabel5c, roleKeywords5c } from "@/components/startsida5c/roleLabels5c";
import { saveProfileContext, type ProfileContext } from "@/lib/profileContext";
import { toast } from "sonner";

type Msg = { id: string; role: "user" | "assistant"; text: string; source?: string };

type QuestionId = "kommun" | "role" | "employment" | "rate";

const QUESTIONS: { id: QuestionId; label: string; prompt: string }[] = [
  { id: "kommun", label: "Var arbetar du?", prompt: "Välj den kommun där du arbetar." },
  { id: "role", label: "Vilket yrke har du?", prompt: "Välj din yrkesroll." },
  { id: "employment", label: "Är du företagare eller anställd?", prompt: "Välj din kontraktsform." },
  { id: "rate", label: "Vilken timersättning har du?", prompt: "Ange din nuvarande ersättning i kronor per timme." },
];

let idc = 0;
const nid = () => `pm${++idc}`;

interface Props {
  userId: string;
  context: ProfileContext | null;
  unlocked: boolean;
  onSaved: () => void | Promise<unknown>;
}

/**
 * Profilsidans AI-assistent.
 * Assistenten är låst till att användaren besvarat de fyra profilfrågorna —
 * de visas alla på en gång i chatten. När svaren sparats öppnas fritextläget.
 */
export default function ProfileAssistantChat({ userId, context, unlocked, onSaved }: Props) {
  const [answers, setAnswers] = useState<Record<QuestionId, string>>({
    kommun: context?.kommun ?? "",
    role: context?.role ?? "",
    employment: context?.employmentType ?? "",
    rate: context?.hourlyRate ? String(context.hourlyRate) : "",
  });
  const [active, setActive] = useState<QuestionId | null>(null);
  const [saving, setSaving] = useState(false);
  const [rateDraft, setRateDraft] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nid(),
      role: "assistant",
      text: unlocked
        ? "Hej igen. Jag har din profil framför mig — fråga mig vad du vill om ersättning, ramavtal eller din nästa förhandling."
        : "Hej! Jag är din personliga AI-assistent. Gör mig personlig först: berätta var du arbetar, vilket yrke du har, om du är företagare eller anställd samt vilken timersättning du har idag.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, active]);

  const { data: rates } = useQuery({
    queryKey: ["profile-assistant-rates"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("rates").select("*");
      if (error) throw error;
      return basePrices(data as unknown as RateRow[]);
    },
  });

  const { data: locations } = useQuery({
    queryKey: ["profile-assistant-locations"],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("kommun").order("kommun");
      if (error) throw error;
      return data ?? [];
    },
  });

  const roleOptions = useMemo(
    () =>
      roleOptions5c(rates ?? [])
        .map((r) => ({ value: r, label: roleLabel5c(r), keywords: roleKeywords5c(r) }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [rates],
  );

  const kommunOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of locations ?? []) if (l.kommun) set.add(l.kommun);
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "sv"))
      .map((k) => ({ value: k, label: k }));
  }, [locations]);

  const push = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: nid() }]);

  const remaining = QUESTIONS.filter((q) => !answers[q.id]);

  async function persist(next: Record<QuestionId, string>) {
    setSaving(true);
    try {
      const saved = await saveProfileContext(userId, {
        role: next.role,
        kommun: next.kommun,
        employmentType: next.employment,
        hourlyRate: Number(next.rate),
      });
      await onSaved();
      push({
        role: "assistant",
        text: `Tack — nu vet jag vem jag pratar med. ${saved.role} i ${saved.kommun}, ${
          next.employment === "foretagare" ? "företagare" : "anställd"
        }, ${Number(next.rate).toLocaleString("sv-SE")} kr/h. Assistenten är upplåst — ställ din första fråga.`,
      });
    } catch (err) {
      console.error("[ProfileAssistantChat] save failed", err);
      toast.error("Kunde inte spara dina uppgifter. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  function answer(id: QuestionId, value: string, shownAs: string) {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    setActive(null);
    push({ role: "user", text: shownAs });
    const left = QUESTIONS.filter((q) => !next[q.id]);
    if (left.length > 0) {
      push({ role: "assistant", text: `Noterat. ${left.length} ${left.length === 1 ? "fråga" : "frågor"} kvar: ${left.map((q) => q.label.toLowerCase()).join(", ")}` });
    } else {
      void persist(next);
    }
  }

  async function askFreeText(question: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("home-assistant", {
        body: {
          action: "freetext",
          question,
          context: context
            ? {
                role: context.role,
                kommun: context.kommun,
                employment_type: context.employmentType,
                current_hourly_rate: context.hourlyRate,
              }
            : null,
        },
      });
      if (error) throw error;
      push({ role: "assistant", text: data?.answer ?? data?.error ?? "Inget svar.", source: data?.source });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[520px] w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#121319]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-4 py-3 sm:px-5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10">
          <Sparkle className="h-3.5 w-3.5 text-white" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">Din AI-assistent</p>
          <p className="truncate text-[11px] text-white/45">
            {unlocked ? "Upplåst · personlig kontext aktiv" : "Låst · besvara frågorna nedan"}
          </p>
        </div>
        {!unlocked && (
          <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/55">
            <Lock className="h-3 w-3" /> Låst
          </span>
        )}
      </div>

      {/* Transkript */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl bg-white px-3.5 py-2 text-sm text-[#121319]">{m.text}</div>
            ) : (
              <div className="max-w-[95%] whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                {m.text}
                {m.source && <span className="mt-1.5 block text-[11px] text-white/40">Källa: {m.source}</span>}
              </div>
            )}
          </div>
        ))}

        {(loading || saving) && (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {saving ? "Sparar…" : "Tänker…"}
          </div>
        )}

        {/* Inline svarskontroll */}
        {active === "kommun" && (
          <SearchableSelect
            options={kommunOptions}
            value={answers.kommun}
            onValueChange={(v) => answer("kommun", v, v)}
            placeholder="Sök kommun…"
            triggerClassName="h-11 rounded-xl border-white/15 bg-[#0b0c10] text-white shadow-none"
          />
        )}
        {active === "role" && (
          <SearchableSelect
            options={roleOptions}
            value={answers.role}
            onValueChange={(v) => answer("role", v, roleLabel5c(v))}
            placeholder="Sök yrkesroll…"
            triggerClassName="h-11 rounded-xl border-white/15 bg-[#0b0c10] text-white shadow-none"
          />
        )}
        {active === "employment" && (
          <div className="flex gap-2">
            {[
              { value: "foretagare", label: "Företagare" },
              { value: "anstalld", label: "Anställd" },
            ].map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => answer("employment", o.value, o.label)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/85 transition-colors hover:bg-white/10"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
        {active === "rate" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(rateDraft.replace(/\s/g, "").replace(",", "."));
              if (!n || n < 100 || n > 3000) {
                toast.error("Ange en timersättning mellan 100 och 3 000 kr.");
                return;
              }
              setRateDraft("");
              answer("rate", String(Math.round(n)), `${Math.round(n).toLocaleString("sv-SE")} kr/h`);
            }}
            className="flex items-center gap-2"
          >
            <input
              autoFocus
              inputMode="numeric"
              value={rateDraft}
              onChange={(e) => setRateDraft(e.target.value)}
              placeholder="t.ex. 750"
              className="h-11 flex-1 rounded-xl border border-white/15 bg-[#0b0c10] px-3 text-sm text-white outline-hidden placeholder:text-white/35"
            />
            <button type="submit" className="h-11 rounded-xl bg-white px-4 text-sm font-semibold text-[#121319]">
              Spara
            </button>
          </form>
        )}
      </div>

      {/* Frågekort — alla på en gång */}
      {!unlocked && (
        <div className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-5">
          <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-white/40">
            Gör din assistent personlig ({QUESTIONS.length - remaining.length}/{QUESTIONS.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUESTIONS.map((q) => {
              const done = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={done || saving}
                  onClick={() => setActive(q.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    done
                      ? "border-white/10 text-white/35"
                      : active === q.id
                        ? "border-white bg-white text-[#121319]"
                        : "border-white/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {done && <Check className="h-3 w-3" />}
                  {q.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fritext — låst tills enkäten är besvarad */}
      <div className="shrink-0 border-t border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
        {unlocked ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = input.trim();
              if (!q || loading) return;
              push({ role: "user", text: q });
              setInput("");
              void askFreeText(q);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ställ din fråga…"
              className="flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-white/35"
            />
            <button
              type="submit"
              aria-label="Skicka"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#121319]"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              const nextQ = remaining[0];
              if (nextQ) setActive(nextQ.id);
              toast.info("Assistenten låses upp när du besvarat de fyra frågorna.");
            }}
            className="flex w-full items-center gap-2 text-left text-sm text-white/45"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" />
            Fritextfrågor öppnas när assistenten känner dig.
          </button>
        )}
      </div>
    </div>
  );
}
