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

const ROLE_PATTERNS: Array<[RegExp, string]> = [
  [/\bDSK\b|distriktssj[uö]k/i, "Distriktssjuksköterska"],
  [/röntgensj[uö]k|\brtg\b/i, "Röntgensjuksköterska"],
  [/barnmorsk/i, "Barnmorska"],
  [/\bssk\b|sjukskötersk/i, "Sjuksköterska"],
  [/specialistl[aä]k/i, "Specialistläkare"],
  [/\bst[-\s]?l[aä]k/i, "ST-läkare"],
  [/leg(?:\.|itimerad)?\s*l[aä]k/i, "Legitimerad läkare"],
];

function inferContextFromMessage(input: string, current: NegotiationContext): NegotiationContext {
  const updates: NegotiationContext = {};

  for (const [pattern, role] of ROLE_PATTERNS) {
    if (pattern.test(input)) {
      updates.role = role;
      break;
    }
  }

  const rateMatch = input.match(/(\d[\d\s]{2,5})\s*(?:kr\s*\/?\s*h|kr\/h|kronor\s*(?:i|per)?\s*tim)/i);
  if (rateMatch) {
    const parsedRate = Number(rateMatch[1].replace(/\s/g, ""));
    if (Number.isFinite(parsedRate) && parsedRate > 0) updates.current_rate = parsedRate;
  }

  const salaryMatch = input.match(/(\d[\d\s]{3,6})\s*(?:kr)?\s*(?:\/\s*mån|per\s*månad|i\s*månad|månadslön)/i);
  if (salaryMatch && !updates.current_rate) {
    const parsedSalary = Number(salaryMatch[1].replace(/\s/g, ""));
    if (Number.isFinite(parsedSalary) && parsedSalary > 0) updates.current_salary = parsedSalary;
  }

  const zoneMatch = input.match(/\bzon\s*([123])\b/i);
  if (zoneMatch) updates.geography = `Zon ${zoneMatch[1]}`;
  else {
    const placeMatch = input.match(/(?:uppdrag\s+i|arbetar\s+i|jobbar\s+i|i|inom|för)\s+([A-ZÅÄÖ][A-Za-zÅÄÖåäö-]{2,})(?:\s+kommun)?\b/);
    if (placeMatch && !/^(jag|min|mitt|zon)$/i.test(placeMatch[1])) updates.geography = placeMatch[1];
  }

  if (/\b(egen\s*(?:företag|bolag)|företagare|f-skatt|konsult)\b/i.test(input)) updates.employment_type = "foretagare";
  if (/\b(anställd|a-skatt|månadslön)\b/i.test(input)) updates.employment_type = "anstalld";

  return { ...current, ...updates };
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

    const requestContext = inferContextFromMessage(trimmed, context);
    const hasRequestContext = Object.values(requestContext).some((value) => value !== undefined && value !== "");
    if (JSON.stringify(requestContext) !== JSON.stringify(context)) {
      setContext(requestContext);
    }

    // Track first message as session start
    if (!hasStarted.current) {
      hasStarted.current = true;
      trackEvent("negotiation_started", { has_context: hasRequestContext });
    }

    trackEvent("negotiation_message_sent");

    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));

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
        body: {
          message: trimmed,
          context: hasRequestContext ? requestContext : undefined,
          history,
        },
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
      // supabase.functions.invoke wraps non-2xx as FunctionsHttpError with .context
      let is429 = false;
      let rateLimitMsg: string | null = null;
      if (err && typeof err === "object" && "context" in err) {
        const ctx = (err as { context?: Response }).context;
        if (ctx?.status === 429) {
          is429 = true;
          try {
            const body = await ctx.clone().json();
            rateLimitMsg = body?.message ?? null;
          } catch { /* ignore */ }
        }
      }
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429) {
        is429 = true;
      }
      const errorMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: is429
          ? (rateLimitMsg ?? "Du har nått dagens gräns på 30 AI-anrop. Återställs vid midnatt.")
          : "Något gick fel — försök igen om en stund.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, context, messages]);

  const updateContext = useCallback((updates: Partial<NegotiationContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setContext({});
  }, []);

  return { messages, isLoading, context, send, updateContext, clearChat };
}
