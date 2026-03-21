import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  const makeId = () => `msg-${++idCounter.current}-${Date.now()}`;

  const send = useCallback(async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

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
        content: data.advice || "Kunde inte generera råd just nu.",
        sources: data.sources,
        capabilities_used: data.capabilities_used,
        data_points: data.data_points,
        missing_info: data.missing_info,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error("[Chat] Error:", err);
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: "Något gick fel — försök igen om en stund.",
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
