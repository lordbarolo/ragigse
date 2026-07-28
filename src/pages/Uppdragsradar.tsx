import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Radio, Loader2, Send, MapPin, Calendar, Clock, MessageSquare } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SearchableSelect from "@/components/SearchableSelect";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

interface RegionPrediction {
  region_namn: string;
  senaste_uppdrag_datum: string;
  snitt_dagar_mellan_uppdrag: number;
  predikterat_nasta_datum: string;
  antal_historiska_uppdrag: number;
  dagar_kvar: number;
  senaste_kund: string;
  medianpris: number | null;
}

interface PredictionsResponse {
  predictions: RegionPrediction[];
  roller: string[];
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uppdragsradar-chat`;

async function fetchPredictions(roll: string): Promise<PredictionsResponse> {
  const { data, error } = await supabase.functions.invoke("get-avrop-predictions", {
    method: "GET",
    // supabase-js appends query string via body for GET when passed as searchParams
    body: undefined,
    headers: {},
    // Custom query via URL — invoke doesn't take query params, so pass via URL suffix:
  } as any);
  // supabase-js .invoke doesn't support query params directly for GET, so fall
  // back to a JWT-authenticated fetch using the current session token.
  if (data || error) {
    // unreachable branch — real request below
  }
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Ingen aktiv session");
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/get-avrop-predictions?roll=${encodeURIComponent(roll)}`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Kunde inte hämta prognoser");
  return res.json();
}

function getDaysColor(dagar: number) {
  if (dagar <= 30) return "text-green-400 bg-green-400/10 border-green-400/30";
  if (dagar <= 90) return "text-amber-400 bg-amber-400/10 border-amber-400/30";
  return "text-muted-foreground bg-muted/50 border-border";
}

function getDaysBadgeLabel(dagar: number) {
  if (dagar <= 0) return "Förväntad nu";
  return `${dagar} dagar`;
}

export default function Uppdragsradar() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { toast } = useToast();

  const [selectedRoll, setSelectedRoll] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/logga-in", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Fetch predictions when roll is selected
  const { data, isLoading, error } = useQuery({
    queryKey: ["uppdragsradar", selectedRoll],
    queryFn: () => fetchPredictions(selectedRoll),
    enabled: !!selectedRoll,
    staleTime: 60_000,
  });

  // Fetch available roles (initial load without specific roll)
  const { data: rolesData } = useQuery({
    queryKey: ["uppdragsradar-roles"],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      // Fetch with a dummy that returns empty predictions but all roles
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/get-avrop-predictions?roll=__all_roles__`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) return { roller: [] };
      const json = await res.json();
      return { roller: json.roller || [] };
    },
    staleTime: 300_000,
  });


  // Chat streaming
  const sendChat = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput("");
    setIsStreaming(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, roll: selectedRoll }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
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
              setChatMessages((prev) => {
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
    } catch (e: any) {
      toast({ title: "Chatfel", description: e.message, variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const predictions = data?.predictions ?? [];
  const allRoles = data?.roller || rolesData?.roller || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-6 pb-2">
        <CompcareLogo variant="wordmark" />
      </header>

      {/* Hero */}
      <section className="px-5 pt-4 pb-6">
        <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3 py-1 text-[11px] font-medium font-display text-primary tracking-wider mb-4">
          <Radio className="w-3.5 h-3.5" />
          Uppdragsprognos
        </div>
        <h1
          className="font-display text-foreground mb-2"
          style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          Se var nästa{" "}
          <span className="text-primary">uppdrag</span> dyker upp
        </h1>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[420px]">
          Välj din roll och se vilka regioner som förväntas publicera uppdrag härnäst — baserat på historiska mönster.
        </p>
      </section>

      {/* Role selector */}
      <section className="px-5 pb-6">
        <label className="text-[13px] font-medium text-muted-foreground mb-2 block">
          Din yrkeskategori
        </label>
        <SearchableSelect
          options={allRoles.map((r: string) => ({ value: r, label: r }))}
          value={selectedRoll}
          onValueChange={setSelectedRoll}
          placeholder="Välj yrkeskategori..."
        />
      </section>

      {/* Predictions */}
      {selectedRoll && (
        <section className="px-5 pb-6">
          <h2 className="text-[16px] font-display font-bold text-foreground mb-3">
            Prognos per region
          </h2>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-[13px]">Analyserar mönster…</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive text-[13px]">
              Kunde inte hämta prognoser. Försök igen.
            </div>
          ) : predictions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-[14px] text-muted-foreground">
                  Otillräckligt underlag för {selectedRoll}. Det behövs minst 3 historiska uppdrag per region.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {predictions.map((p) => {
                const colorClass = getDaysColor(p.dagar_kvar);
                return (
                  <Card key={p.region_namn} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <MapPin className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-[14px] font-semibold text-foreground truncate">
                              {p.region_namn}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Senaste: {p.senaste_uppdrag_datum}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Snitt: {p.snitt_dagar_mellan_uppdrag}d
                            </span>
                            <span>
                              {p.antal_historiska_uppdrag} historiska uppdrag
                            </span>
                            {p.medianpris && (
                              <span>{p.medianpris} kr/tim</span>
                            )}
                          </div>
                          <div className="mt-2 text-[12px] text-muted-foreground">
                            Prognos nästa: <span className="text-foreground font-medium">{p.predikterat_nasta_datum}</span>
                            {p.senaste_kund && <span className="ml-2">· {p.senaste_kund}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold ${colorClass}`}>
                            {getDaysBadgeLabel(p.dagar_kvar)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* AI Chat */}
      {selectedRoll && (
        <section className="px-5 pb-24">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h2 className="text-[16px] font-display font-bold text-foreground">
              Fråga om marknaden
            </h2>
          </div>
          <Card>
            <CardContent className="p-4">
              {/* Messages */}
              <div className="max-h-80 overflow-y-auto space-y-3 mb-3">
                {chatMessages.length === 0 && (
                  <p className="text-[13px] text-muted-foreground italic">
                    Ställ en fråga, t.ex. "Vilka regioner behöver {selectedRoll.toLowerCase()} i sommar?"
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground rounded-lg px-3 py-2 ml-8"
                        : "text-foreground"
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
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChat()}
                  placeholder="Ställ en fråga..."
                  disabled={isStreaming}
                  className="text-[13px]"
                />
                <Button
                  size="icon"
                  onClick={sendChat}
                  disabled={isStreaming || !chatInput.trim()}
                  aria-label="Skicka meddelande"
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
