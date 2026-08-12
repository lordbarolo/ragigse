import { useEffect, useRef, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Lock } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";

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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * AssistantDemoChat — uppspelad demo av assistenten på startsidan.
 * Ingen inmatning: frågor och svar skrivs fram tecken för tecken (vänster→höger)
 * och rullar vidare till nästa fråga. Fritext kräver konto.
 */
export default function AssistantDemoChat() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<string | undefined>(undefined);
  const [thinking, setThinking] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;

    const typeInto = async (
      text: string,
      set: (v: string) => void,
      speed: number,
    ) => {
      for (let i = 1; i <= text.length; i++) {
        if (!aliveRef.current) return;
        set(text.slice(0, i));
        await sleep(speed);
      }
    };

    const run = async () => {
      let i = 0;
      while (aliveRef.current) {
        const preset = PRESETS[i % PRESETS.length]!;
        i++;

        setAnswer("");
        setSource(undefined);
        setQuestion("");
        await typeInto(preset.label, setQuestion, 26);
        if (!aliveRef.current) return;

        setThinking(true);
        let text = "Assistenten kunde inte svara just nu.";
        let src: string | undefined;
        try {
          const { data } = await supabase.functions.invoke("home-assistant", {
            body: { action: "answer", key: preset.key },
          });
          if (data?.answer) {
            text = data.answer as string;
            src = data.source as string | undefined;
          }
        } catch {
          /* behåll fallbacktexten */
        }
        await sleep(500);
        if (!aliveRef.current) return;
        setThinking(false);
        setSource(src);
        await typeInto(text, setAnswer, 12);
        if (!aliveRef.current) return;
        await sleep(4200);
      }
    };

    run();
    return () => {
      aliveRef.current = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <div className="rounded-3xl border border-border/70 bg-white/70 p-5 shadow-xl backdrop-blur-md sm:p-7">
        <div className="min-h-[240px] space-y-5">
          {question && (
            <Message from="user">
              <div className="flex max-w-[85%] flex-col items-end gap-1.5">
                <span className="pr-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Du
                </span>
                <MessageContent className="rounded-2xl rounded-br-md border border-primary/20 bg-primary text-primary-foreground px-4 py-3 text-[15px] leading-relaxed shadow-sm">
                  {question}
                </MessageContent>
              </div>
            </Message>
          )}

          {thinking && <Shimmer className="text-sm">Tänker…</Shimmer>}

          {answer && (
            <Message from="assistant">
              <div className="flex max-w-[90%] flex-col items-start gap-1.5">
                <span className="pl-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assistenten
                </span>
                <MessageContent className="rounded-2xl rounded-bl-md border border-border bg-secondary/60 px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-sm">
                  <MessageResponse>{answer}</MessageResponse>
                  {source && (
                    <span className="mt-1.5 block text-[13px] text-muted-foreground">
                      Källa: {source}
                    </span>
                  )}
                </MessageContent>
              </div>
            </Message>
          )}
        </div>


        <Link
          to="/registrera"
          className="mt-6 flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-secondary"
        >
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left text-[15px] text-muted-foreground">
            Ställ din egen fråga
          </span>
          <span className="shrink-0 rounded-full bg-[#1a1b22] px-3 py-1.5 text-[13.5px] font-semibold text-white">
            Skapa konto
          </span>
        </Link>
      </div>
    </div>
  );
}
