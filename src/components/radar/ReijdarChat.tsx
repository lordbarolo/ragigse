import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, Bot, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { trackEvent } from "@/lib/trackEvent";

type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uppdragsradar-chat`;
const MAX_INPUT_LENGTH = 500;

export default function ReijdarChat({ selectedRole, initialMessage }: { selectedRole?: string; initialMessage?: string }) {
  const { user, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial message from example questions
  useEffect(() => {
    if (initialMessage && open) {
      setInput(initialMessage);
    }
  }, [initialMessage, open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    if (!hasTrackedStart) {
      trackEvent("reijdar_chat_started" as any, { role: selectedRole || "" });
      setHasTrackedStart(true);
    }
    trackEvent("reijdar_message_sent" as any, { role: selectedRole || "" });

    const userMsg: ChatMsg = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          roll: selectedRole || "Sjuksköterska",
        }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        if (resp.status === 429) {
          toast({ title: "För många försök", description: "Försök igen om en stund.", variant: "destructive" });
          return;
        }
        throw new Error(errData.error || "Chatfel");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      trackEvent("reijdar_advice_received" as any, { role: selectedRole || "" });
    } catch (e: any) {
      toast({ title: "Chatfel", description: e.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = () => sendMessage(input);

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-3.5 pr-4 py-2.5 shadow-lg hover:bg-primary/90 transition-all active:scale-95"
        >
          <Bot className="w-4.5 h-4.5" />
          <span className="text-[12px] font-semibold">Fråga Reijdar</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-0 bottom-14 z-40 max-h-[70vh] flex flex-col bg-background border-t border-border shadow-2xl rounded-t-2xl safe-area-bottom">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <div>
                <span className="text-[14px] font-bold text-foreground">Reijdar</span>
                <span className="text-[11px] text-muted-foreground ml-1.5">AI-assistent</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Auth gate */}
          {!authLoading && !user ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
              <Bot className="w-10 h-10 text-primary/30" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Skapa ett konto för att använda assistenten</p>
                <p className="text-xs text-muted-foreground">Registrera dig gratis för att få personliga råd om din ersättning och förhandling.</p>
              </div>
              <div className="flex gap-2">
                <Link to="/registrera" onClick={() => setOpen(false)}>
                  <Button size="sm" className="gap-1.5">
                    <LogIn className="w-3.5 h-3.5" />
                    Registrera dig
                  </Button>
                </Link>
                <Link to="/logga-in" onClick={() => setOpen(false)}>
                  <Button size="sm" variant="outline">Logga in</Button>
                </Link>
              </div>
            </div>
          ) : (
          <>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <Bot className="w-8 h-8 text-primary/40 mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">
                  Fråga mig om kommande uppdrag, priser eller regioner.
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  T.ex. "Vilka regioner behöver sjuksköterskor snart?"
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary/10 text-foreground rounded-xl px-3 py-2 ml-8"
                    : "text-foreground mr-4"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 px-4 py-3 border-t border-border shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Ställ en fråga om uppdrag..."
              disabled={isStreaming}
              className="text-[13px]"
              maxLength={MAX_INPUT_LENGTH}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          </>
          )}
        </div>
      )}
    </>
  );
}
