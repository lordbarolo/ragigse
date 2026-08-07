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
      text: "Hej! Jag är din vårdbemanning.ai-assistent. Välj en fråga så svarar jag, eller logga in för att ställa din egen fråga.",
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

  const chipClass =
    "chip-float rounded-full bg-white/[0.045] px-3.5 py-2 text-left text-[12.5px] leading-snug text-white/70 backdrop-blur-sm transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40";

  const composer = (
    <div className="mx-auto w-full max-w-[560px]">
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
          className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 backdrop-blur-md"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fråga assistenten"
            className="h-9 flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-white/40"
          />
          <button
            type="submit"
            aria-label="Skicka"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#0b0c10] transition-opacity hover:opacity-90"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <Link
          to="/registrera"
          className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2.5 backdrop-blur-md transition-colors hover:bg-white/[0.09]"
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-white/45" />
          <span className="flex-1 text-sm text-white/45">Fråga assistenten</span>
          <span className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#0b0c10]">
            Skapa konto
          </span>
        </Link>
      )}
    </div>
  );

  const positions = [
    "left-[1%] top-[4%] w-[220px]",
    "right-[2%] top-[1%] w-[210px]",
    "left-[6%] top-[27%] w-[200px]",
    "right-[4%] top-[30%] w-[215px]",
    "left-[3%] bottom-[13%] w-[205px]",
    "right-[1%] bottom-[9%] w-[220px]",
    "left-1/2 -translate-x-1/2 bottom-[1%] w-[250px]",
  ];

  return (
    <div className="relative w-full">
      {/* Transkript — kantlös, visas när samtalet startat */}
      {started && (
        <div
          ref={scrollRef}
          className="mb-6 max-h-[340px] space-y-4 overflow-y-auto pr-1"
        >
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl bg-white/[0.07] px-3.5 py-2 text-sm text-white">
                  {m.text}
                </div>
              ) : (
                <div className="max-w-[95%] whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                  {m.text}
                  {m.source && (
                    <span className="mt-1.5 block text-[11px] text-white/40">Källa: {m.source}</span>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tänker…
            </div>
          )}
        </div>
      )}

      {started ? (
        <>
          {composer}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={loading}
                onClick={() => onPreset(p)}
                className={chipClass}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop: frågor svävar runt skrivrutan */}
          <div className="relative hidden h-[460px] lg:block">
            {PRESETS.map((p, i) => (
              <button
                key={p.key}
                type="button"
                disabled={loading}
                onClick={() => onPreset(p)}
                style={{ animationDelay: `${(i % 5) * 1.1}s`, animationDuration: `${7 + (i % 4)}s` }}
                className={`absolute ${positions[i] ?? ""} ${i % 2 === 0 ? "chip-float" : "chip-float-reverse"} rounded-full bg-white/[0.045] px-3.5 py-2 text-left text-[12.5px] leading-snug text-white/70 backdrop-blur-sm transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40`}
              >
                {p.label}
              </button>
            ))}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 px-[22%]">{composer}</div>
          </div>

          {/* Mobil/tablet */}
          <div className="lg:hidden">
            {composer}
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {PRESETS.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  disabled={loading}
                  onClick={() => onPreset(p)}
                  style={{ animationDelay: `${(i % 4) * 1.1}s` }}
                  className={chipClass}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/45">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tänker…
            </div>
          )}
        </>
      )}
    </div>
  );
}

