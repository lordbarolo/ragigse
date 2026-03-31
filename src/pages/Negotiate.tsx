import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useNegotiationChat } from "@/hooks/useNegotiationChat";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ContextBar from "@/components/chat/ContextBar";
import SuggestedPrompts from "@/components/chat/SuggestedPrompts";
import Survey, { type SurveyResult } from "@/components/Survey";
import { trackEvent } from "@/lib/trackEvent";

const PAGE_TITLE = "Förhandla din ersättning — CompCare";
const PAGE_DESC = "AI-driven förhandlingsassistent som ger dig konkreta råd baserade på aktuell marknadsdata för din roll och region.";
export default function Negotiate() {
  const { messages, isLoading, context, send, updateContext, clearChat } = useNegotiationChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [surveyDone, setSurveyDone] = useState(false);

  // SEO metadata
  useEffect(() => {
    document.title = PAGE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", PAGE_DESC);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = PAGE_DESC;
      document.head.appendChild(m);
    }
    trackEvent("product_page_viewed", { product: "forhandlingscoachen" });
  }, []);

  // Pre-fill context from URL params (e.g. from survey flow)
  useEffect(() => {
    const role = searchParams.get("role");
    const geo = searchParams.get("geo");
    const emp = searchParams.get("emp");
    const salary = searchParams.get("salary");
    const rate = searchParams.get("rate");

    const updates: Record<string, unknown> = {};
    if (role) updates.role = role;
    if (geo) updates.geography = geo;
    if (emp) updates.employment_type = emp;
    if (salary) updates.current_salary = Number(salary);
    if (rate) updates.current_rate = Number(rate);
    if (Object.keys(updates).length > 0) {
      updateContext(updates);
      setSurveyDone(true);
    }
  }, [searchParams, updateContext]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const hasMessages = messages.length > 0;
  const hasContext = Object.keys(context).filter((k) => (context as Record<string, unknown>)[k] !== undefined).length > 0;

  const handleSurveyComplete = (result: SurveyResult) => {
    const hourlyRate = result.salaryType === "monthly"
      ? Math.round(result.currentSalary / 167)
      : result.currentSalary;

    updateContext({
      role: result.yrke,
      geography: result.kommun,
      employment_type: result.employmentType,
      current_rate: hourlyRate,
    });
    setSurveyDone(true);
  };

  // Show survey if no context and survey not completed
  const showSurvey = !hasContext && !surveyDone && !hasMessages;

  return (
    <div className="min-h-[100dvh] bg-secondary/30 flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ height: "min(85vh, 800px)" }}>
        {/* Header */}
        <nav className="flex items-center justify-between px-4 h-[52px] flex-shrink-0 border-b border-border/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Link>
            <div>
              <span className="font-display font-bold text-foreground text-sm tracking-tight">
                Löneassistenten
              </span>
              <span className="text-[10px] text-muted-foreground ml-2 font-medium">
                powered by CI
              </span>
            </div>
          </div>
          {hasMessages && (
            <button
              onClick={clearChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              title="Ny konversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </nav>

        {showSurvey ? (
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <Survey onComplete={handleSurveyComplete} />
          </div>
        ) : (
          <>
            {/* Context bar */}
            <div className="flex-shrink-0 px-4 py-2">
              <ContextBar context={context} onUpdate={updateContext} />
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
              {!hasMessages ? (
                <SuggestedPrompts onSelect={send} />
              ) : (
                <div className="flex flex-col gap-3 py-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2">
              <ChatInput onSend={send} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
