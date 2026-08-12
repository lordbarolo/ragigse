"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import { trackEvent } from "@/lib/trackEvent";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: string;
};

type PresetKey =
  | "ramavtal"
  | "anstallningsform"
  | "ob"
  | "vite"
  | "krav_bemanning"
  | "uppsagning";

type Preset = { key: PresetKey; label: string };

const PRESETS: Preset[] = [
  { key: "ramavtal", label: "Vad är ramavtalet?" },
  { key: "anstallningsform", label: "Företagare eller anställd?" },
  { key: "ob", label: "OB, jour och beredskap" },
  { key: "vite", label: "Vite och avtalsvillkor" },
  { key: "krav_bemanning", label: "Krav för bemanning" },
  { key: "uppsagning", label: "Uppsägning och avbrott" },
];

let idc = 0;
const nid = () => `m${++idc}`;

export default function AvtalsassistentChat() {
  const { user } = useAuth();
  const { context: profile } = useProfileContext(user?.id);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nid(),
      role: "assistant",
      text:
        "Välkommen till Avtalsassistenten. Jag svarar utifrån SKR:s ramavtal för hyrpersonal och dina sparade uppgifter. Välj en fråga nedan eller ställ en egen.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const push = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: nid() }]);

  async function askPreset(key: PresetKey) {
    setLoading(true);
    trackEvent("avtalsassistent_question_clicked", {
      question_key: key,
      is_preset: true,
      is_authenticated: !!user,
    });
    try {
      const { data, error } = await supabase.functions.invoke("home-assistant", {
        body: { action: "answer", key },
      });
      if (error) throw error;
      push({
        role: "assistant",
        text: data?.answer ?? data?.error ?? "Inget svar.",
        source: data?.source,
      });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  async function askFreeText(question: string) {
    setLoading(true);
    trackEvent("avtalsassistent_question_clicked", {
      question_key: "freetext",
      is_preset: false,
      is_authenticated: !!user,
    });
    try {
      const { data, error } = await supabase.functions.invoke("home-assistant", {
        body: {
          action: "freetext",
          question,
          context: profile
            ? {
                role: profile.role,
                kommun: profile.kommun,
                employment_type: profile.employmentType,
                current_hourly_rate: profile.hourlyRate,
              }
            : null,
        },
      });
      if (error) throw error;
      const warning = data?.quota?.warning;
      push({
        role: "assistant",
        text: data?.answer ?? data?.error ?? "Inget svar.",
        source: warning ? `${data?.source ?? "SKR-ramavtal"} • ${warning}` : data?.source,
      });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    push({ role: "user", text: q });
    setInput("");
    askFreeText(q);
  }

  return (
    <div className="flex flex-col gap-5">
      <div
        ref={scrollRef}
        className="max-h-[min(60vh,520px)] space-y-5 overflow-y-auto pr-2"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[85%] ${
                m.role === "user"
                  ? "bg-white/10 text-white"
                  : "text-white/90"
              }`}
            >
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              </div>
              {m.source && (
                <p className="mt-2 border-t border-white/10 pt-2 text-[12px] text-white/45">
                  Källa: {m.source}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-white/50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Tänker…</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            disabled={loading}
            onClick={() => {
              push({ role: "user", text: p.label });
              askPreset(p.key);
            }}
            className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 transition-colors hover:border-white/30 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ställ en egen fråga om avtalet..."
          rows={2}
          className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 pr-12 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none focus:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="absolute right-3 top-3 rounded-xl bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
