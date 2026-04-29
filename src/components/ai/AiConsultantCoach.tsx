import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

interface Props {
  role: string | null;
  region: string | null;
  employmentType: string | null;
  experienceYears: number | null;
  currentRate: number | null;
}

const STARTERS = [
  "Hur förhandlar jag bättre timpris?",
  "Vilka dokument bör jag ha redo?",
  "Vad bör jag tänka på inför ett nytt uppdrag?",
];

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-consultant-coach`;

export default function AiConsultantCoach(ctx: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let acc = "";
    const append = (delta: string) => {
      acc += delta;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const { data: { session } } = await import("@/integrations/supabase/client").then(m => m.supabase.auth.getSession());
      if (!session) {
        toast.error("Du måste vara inloggad för att använda coachen.");
        setStreaming(false);
        return;
      }
      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next, context: ctx }),
      });

      if (resp.status === 429) {
        const j = await resp.json().catch(() => ({}));
        toast.error(j.message || "Du har nått dagens AI-gräns. Återställs vid midnatt.");
        setMessages(next);
        setStreaming(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI-krediter saknas. Kontakta admin.");
        setMessages(next);
        setStreaming(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Coachen är inte tillgänglig just nu.");
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) append(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Kunde inte nå coachen.");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Personlig coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ställ frågor om förhandling, dokumentation, uppdragssök eller karriär. Coachen känner till din roll och region.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs rounded-full border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 hover:bg-[#8b5cf6]/15 px-3 py-1.5 text-[#5b21b6] transition-colors"
                  onClick={() => send(s)}
                  disabled={streaming}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.length > 0 && (
          <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs leading-relaxed rounded-lg p-3 ${
                  m.role === "user"
                    ? "bg-[#8b5cf6]/10 ml-6"
                    : "bg-[#f5f3ff] mr-6"
                }`}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-p:text-xs prose-li:text-xs">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-line">{m.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv en fråga…"
            className="text-sm h-9 bg-white border-[#8b5cf6]/20 focus-visible:ring-[#8b5cf6]/40"
            disabled={streaming}
          />
          <Button
            type="submit"
            size="sm"
            disabled={streaming || !input.trim()}
            className="shrink-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] text-white border-0 hover:from-[#7c3aed] hover:to-[#c026d3]"
          >
            {streaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground">AI-coach. Inga peer-jämförelser. Källa: SKR-ramavtal + branschmarginal.</p>
      </CardContent>
    </Card>
  );
}
