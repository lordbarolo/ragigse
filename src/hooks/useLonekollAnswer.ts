import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeReijdarText } from "@/lib/reijdarText";
import type { LonekollTopicId } from "@/data/lonekollQuestions";

export interface LonekollAnswerState {
  answer: string | null;
  loading: boolean;
  error: string | null;
  context: Record<string, unknown> | null;
}

export function useLonekollAnswer() {
  const [state, setState] = useState<LonekollAnswerState>({
    answer: null,
    loading: false,
    error: null,
    context: null,
  });

  const ask = useCallback(async (topicId: LonekollTopicId, questionId: string) => {
    setState({ answer: null, loading: true, error: null, context: null });
    try {
      const { data, error } = await supabase.functions.invoke("lonekoll-answer", {
        body: { topicId, questionId },
      });
      if (error) {
        // FunctionsHttpError wraps non-2xx as error.context
        let msg = "Något gick fel. Försök igen om en stund.";
        if (error && typeof error === "object" && "context" in error) {
          const ctx = (error as { context?: Response }).context;
          if (ctx?.status === 429) {
            try {
              const body = await ctx.clone().json();
              msg = body?.message ?? "Du har nått dagens gräns på 30 AI-anrop.";
            } catch { /* ignore */ }
          }
        }
        setState({ answer: null, loading: false, error: msg, context: null });
        return;
      }
      setState({
        answer: sanitizeReijdarText(data?.answer ?? ""),
        loading: false,
        error: null,
        context: data?.context ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Något gick fel.";
      setState({ answer: null, loading: false, error: msg, context: null });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ answer: null, loading: false, error: null, context: null });
  }, []);

  return { ...state, ask, reset };
}
