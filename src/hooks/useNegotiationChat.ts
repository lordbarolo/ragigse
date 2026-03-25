import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { sanitizeReijdarSourceName, sanitizeReijdarText } from "@/lib/reijdarText";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { name: string; version: string; confidence: string }[];
  capabilities_used?: string[];
  data_points?: Record<string, unknown>[];
  missing_info?: string[];
  timestamp: Date;
}

export interface NegotiationContext {
  role?: string;
  geography?: string;
  employment_type?: string;
  current_salary?: number;
  current_rate?: number;
  experience_years?: number;
}

export function useNegotiationChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<NegotiationContext>({});
  const idCounter = useRef(0);
  const hasStarted = useRef(false);

  const makeId = () => `msg-${++idCounter.current}-${Date.now()}`;

  const send = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Track first message as session start
    if (!hasStarted.current) {
      hasStarted.current = true;
      trackEvent("negotiation_started", { has_context: Object.keys(context).length > 0 });
    }

    trackEvent("negotiation_message_sent");

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("salary-negotiation-agent", {
        body: { message: trimmed, context: Object.keys(context).length > 0 ? context : undefined },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: sanitizeReijdarText(data.advice || "Kunde inte generera råd just nu."),
        sources: data.sources?.map((source: { name: string; version: string; confidence: string }) => ({
          ...source,
          name: sanitizeReijdarSourceName(source.name),
        })),
        capabilities_used: data.capabilities_used,
        data_points: data.data_points,
        missing_info: data.missing_info?.map((item: string) => sanitizeReijdarText(item)),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      trackEvent("negotiation_advice_received", {
        capabilities_used: (data.capabilities_used || []).join(","),
      });
    } catch (err: unknown) {
      console.error("[Chat] Error:", err);
      const is429 = err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429;
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: is429
          ? "För många försök — testa igen om en stund."
          : "Något gick fel — försök igen om en stund.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context]);

  const updateContext = useCallback((updates: Partial<NegotiationContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setContext({});
  }, []);

  return { messages, isLoading, context, send, updateContext, clearChat };
}
