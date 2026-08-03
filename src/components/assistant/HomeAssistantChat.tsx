import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ArrowUp, Lock, Loader2 } from "lucide-react";
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
  | "ssk_stockholm"
  | "allmanlakare_torsby"
  | "erfarenhet"
  | "termin10"
  | "patientforsakring"
  | "avrop_gavle"
  | "lon_malmo";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "ssk_stockholm", label: "Vad betalar Stockholm för en leg. sjuksköterska?" },
  { key: "allmanlakare_torsby", label: "Vad kan jag tjäna som allmänläkare i Torsby?" },
  { key: "erfarenhet", label: "Hur lång erfarenhet behöver jag för att jobba med bemanning?" },
  { key: "termin10", label: "Kan jag ta konsultvikariat under termin 10 på läkarprogrammet?" },
  { key: "patientforsakring", label: "Behöver jag patientförsäkring som företagande läkare?" },
  { key: "avrop_gavle", label: "Hur ofta avropar Gävle sjukhus sjuksköterskor till akuten?" },
  { key: "lon_malmo", label: "Är 390 kr/timme bra lön i Malmö?" },
];

let idc = 0;
const nid = () => `m${++idc}`;

/**
 * HomeAssistantChat — startsidans assistent (dev).
 * Publikt: endast fördefinierade frågor. Fritext kräver konto.
 */
export default function HomeAssistantChat() {
  const { user } = useAuth();
  const { context: profile } = useProfileContext(user?.id);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: nid(),
      role: "assistant",
      text: "Hej! Jag är din CompCare-assistent. Välj en fråga så svarar jag, eller logga in för att ställa din egen fråga.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const started = messages.some((m) => m.role === "user");

  useEffect(() => {
    if (!user) trackEvent("home_chat_login_prompt_shown", { surface: "startsida" });
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const push = (m: Omit<Msg, "id">) => setMessages((prev) => [...prev, { ...m, id: nid() }]);

  async function ask(key: PresetKey) {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("home-assistant", {
        body: { action: "answer", key },
      });
      if (error) throw error;
      push({ role: "assistant", text: data?.answer ?? data?.error ?? "Inget svar.", source: data?.source });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  async function askFreeText(question: string) {
    setLoading(true);
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
      push({ role: "assistant", text: data?.answer ?? data?.error ?? "Inget svar.", source: data?.source });
    } catch {
      push({ role: "assistant", text: "Något gick fel. Försök igen om en stund." });
    } finally {
      setLoading(false);
    }
  }

  function onPreset(p: { key: PresetKey; label: string }) {
    trackEvent("home_chat_question_clicked", { question_key: p.key, is_authenticated: !!user });
    push({ role: "user", text: p.label });
    ask(p.key);
  }

  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-[560px]">
      {/* Transkript */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl bg-[#3D3491] text-white px-3.5 py-2 text-sm">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[95%] text-sm text-black/85 whitespace-pre-wrap leading-relaxed">
                {m.text}
                {m.source && (
                  <span className="mt-1.5 block text-[11px] text-black/45">Källa: {m.source}</span>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-black/50">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Tänker…
          </div>
        )}
      </div>

      {/* Fördefinierade frågor — kompakt lista när samtalet startat */}
      <div
        className={`shrink-0 px-4 sm:px-5 pb-2 pt-3 border-t border-black/5 flex flex-wrap gap-1.5 overflow-y-auto ${
          started ? "max-h-[76px]" : ""
        }`}
      >
        {PRESETS.map((p) => (
          <button
            key={p.key}
            disabled={loading}
            onClick={() => onPreset(p)}
            className="text-xs rounded-full border border-black/15 px-3 py-1.5 text-black/75 hover:bg-black/5 transition-colors disabled:opacity-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Fritext — låst utan konto */}
      <div className="shrink-0 px-4 sm:px-5 py-3 border-t border-black/10 bg-black/[0.02]">
        {user ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = input.trim();
              if (!q) return;
              push({ role: "user", text: q });
              setInput("");
              askFreeText(q);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ställ din egen fråga…"
              className="flex-1 bg-transparent text-sm outline-hidden placeholder:text-black/40"
            />
            <button
              type="submit"
              aria-label="Skicka"
              className="shrink-0 w-8 h-8 rounded-full bg-[#3D3491] text-white flex items-center justify-center"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-2.5">
            <input
              readOnly
              onFocus={(e) => e.currentTarget.blur()}
              placeholder="Ställ din egen fråga…"
              aria-label="Fritext kräver konto"
              className="w-full cursor-pointer rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black/60 outline-hidden placeholder:text-black/40"
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-black/55 flex items-start gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Vill du ställa egna frågor till AI-assistenten och få en personlig analys utifrån ditt nuvarande
                avtal? Logga in med e-post på 10 sekunder.
              </p>
              <Link
                to="/registrera"
                className="shrink-0 self-start text-sm font-semibold px-4 py-2 rounded-lg bg-[#3D3491] text-white hover:opacity-90 transition-opacity"
              >
                Skapa konto
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
