import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { ArrowUp, Lock, Loader2 } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
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
    "h-auto max-w-[260px] whitespace-normal rounded-2xl border border-border/70 bg-secondary/45 px-4 py-3 text-left text-[13.5px] font-normal leading-snug text-muted-foreground backdrop-blur-md hover:border-primary/30 hover:bg-secondary/75 hover:text-foreground";

  const composer = (
    <div className="mx-auto mb-8 w-full max-w-[560px]">
      {user ? (
        <PromptInput
          onSubmit={(message) => {
            const q = message.text.trim();
            if (!q) return;
            push({ role: "user", text: q });
            setInput("");
            askFreeText(q);
          }}
          className="rounded-2xl border-border/70 bg-secondary/55 shadow-2xl backdrop-blur-md"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fråga assistenten"
            className="min-h-12 py-3.5 text-[15px] text-foreground placeholder:text-muted-foreground"
          />
          <PromptInputFooter className="justify-end pt-0">
            <PromptInputSubmit
              aria-label="Skicka"
              disabled={!input.trim() || loading}
              status={loading ? "submitted" : "ready"}
              className="rounded-xl"
            >
              <ArrowUp className="size-4" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
      ) : (
        <Link
          to="/registrera"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-3 shadow-lg backdrop-blur-md transition-colors hover:bg-secondary"
        >
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-[15px] text-muted-foreground">Fråga assistenten</span>
          <span className="shrink-0 rounded-full bg-[#1a1b22] px-3 py-1.5 text-[13.5px] font-semibold text-white">
            Skapa konto
          </span>
        </Link>
      )}
    </div>
  );

  return (
    <div className="relative w-full">
      {/* Transkript — kantlös, visas när samtalet startat */}
      {started && (
        <div
          ref={scrollRef}
          className="mb-6 max-h-[340px] space-y-4 overflow-y-auto pr-1"
        >
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className="text-[15px] leading-relaxed">
                <MessageResponse>{m.text}</MessageResponse>
                {m.source && (
                  <span className="mt-1.5 block text-[12.5px] text-muted-foreground">Källa: {m.source}</span>
                )}
              </MessageContent>
            </Message>
          ))}
          {loading && (
            <Shimmer className="text-sm">Tänker…</Shimmer>
          )}
        </div>
      )}

      {started ? (
        <>
          {composer}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {PRESETS.map((p) => (
              <Button
                key={p.key}
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => onPreset(p)}
                className={chipClass}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Desktop: varje fråga rör sig endast inom en egen gridcell. */}
          <div className="hidden w-full md:block">
            <div className="grid min-h-[320px] w-full grid-cols-[minmax(0,1fr)_minmax(280px,360px)_minmax(0,1fr)] grid-rows-[1fr_auto] items-center gap-5 lg:gap-10">
              <div className="flex min-w-0 flex-col items-end justify-center gap-12 py-5">
                {[PRESETS[0], PRESETS[2], PRESETS[4]].map((p, i) => p && (
                  <Button key={p.key} type="button" variant="ghost" disabled={loading} onClick={() => onPreset(p)} style={{ animationDelay: `${i * -3.1}s` }} className={`${chipClass} ${i % 2 === 0 ? "chip-float" : "chip-float-reverse"}`}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="relative z-10 row-span-1 w-full self-center">{composer}</div>
              <div className="flex min-w-0 flex-col items-start justify-center gap-12 py-5">
                {[PRESETS[1], PRESETS[3], PRESETS[5]].map((p, i) => p && (
                  <Button key={p.key} type="button" variant="ghost" disabled={loading} onClick={() => onPreset(p)} style={{ animationDelay: `${i * -4.3}s` }} className={`${chipClass} ${i % 2 === 0 ? "chip-float-reverse" : "chip-float"}`}>
                    {p.label}
                  </Button>
                ))}
              </div>
              {PRESETS[6] && (
                <div className="col-span-3 flex justify-center pb-4">
                  <Button type="button" variant="ghost" disabled={loading} onClick={() => onPreset(PRESETS[6])} className={`${chipClass} chip-float`}>
                    {PRESETS[6].label}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobil/tablet — endast 3 mest konverterande frågor */}
          <div className="md:hidden">
            {composer}
            <div className="mt-5 flex flex-wrap justify-center gap-1.5">
              {[PRESETS[0], PRESETS[1], PRESETS[6]].map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => onPreset(p)}
                  className={chipClass}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tänker…
            </div>
          )}
        </>
      )}
    </div>
  );
}

