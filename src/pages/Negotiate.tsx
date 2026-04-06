import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, RotateCcw, Lock, Mail, Loader2, Flag } from "lucide-react";
import { useNegotiationChat } from "@/hooks/useNegotiationChat";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import ContextBar from "@/components/chat/ContextBar";
import SuggestedPrompts from "@/components/chat/SuggestedPrompts";
import { trackEvent } from "@/lib/trackEvent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

const PAGE_TITLE = "Förhandla din ersättning — CompCare";
const PAGE_DESC = "AI-driven förhandlingsassistent som ger dig konkreta råd baserade på aktuell marknadsdata för din roll och region.";

export default function Negotiate() {
  const { messages, isLoading, context, send, updateContext, clearChat } = useNegotiationChat();
  const { user, loading: authLoading } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Email gate state
  const [emailGateUnlocked, setEmailGateUnlocked] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateLoading, setGateLoading] = useState(false);

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

  // Load profile data for authenticated users
  useEffect(() => {
    if (!user || profileLoaded) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("consultant_profiles")
        .select("specialty_id, region_id, employment_type, current_hourly_rate, current_monthly_salary, experience_years, salary_type")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        const updates: Record<string, unknown> = {};

        // Resolve specialty name
        if (data.specialty_id) {
          const { data: spec } = await supabase
            .from("specialties")
            .select("name")
            .eq("id", data.specialty_id)
            .maybeSingle();
          if (spec?.name) updates.role = spec.name;
        }

        // Resolve region/kommun
        if (data.region_id) {
          const { data: region } = await supabase
            .from("regions")
            .select("kommun")
            .eq("id", data.region_id)
            .maybeSingle();
          if (region?.kommun) updates.geography = region.kommun;
        }

        if (data.employment_type) updates.employment_type = data.employment_type;
        if (data.current_hourly_rate) updates.current_rate = data.current_hourly_rate;
        if (data.current_monthly_salary) updates.current_salary = data.current_monthly_salary;
        if (data.experience_years) updates.experience_years = data.experience_years;

        if (Object.keys(updates).length > 0) {
          updateContext(updates);
        }
      }
      setProfileLoaded(true);
    };

    loadProfile();
  }, [user, profileLoaded, updateContext]);

  // Pre-fill context from URL params
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
    }
  }, [searchParams, updateContext]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  const handleEmailGate = async () => {
    const trimmed = gateEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Ange en giltig e-postadress.");
      return;
    }
    setGateLoading(true);
    try {
      // Save email via existing save-email function
      await supabase.functions.invoke("save-email", {
        body: { email: trimmed, source: "negotiation_gate" },
      });
      trackEvent("negotiation_email_gate_completed", { email: trimmed });
      setEmailGateUnlocked(true);
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setGateLoading(false);
    }
  };

  const hasMessages = messages.length > 0;
  const hasContext = Object.keys(context).filter((k) => (context as Record<string, unknown>)[k] !== undefined).length > 0;

  // Determine access: logged in OR email gate unlocked
  const hasAccess = !!user || emailGateUnlocked;

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-secondary/30 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-secondary/30 flex flex-col items-center p-4 pt-8">
      <div className="w-full max-w-[720px] bg-background border border-border rounded-2xl shadow-xl flex flex-col overflow-hidden" style={{ height: "min(85vh, 800px)" }}>
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
          {hasMessages && hasAccess && (
            <button
              onClick={clearChat}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              title="Ny konversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </nav>

        {!hasAccess ? (
          /* ── Email Gate ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground tracking-tight text-center">
              Löneassistenten
            </h2>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm leading-relaxed">
              Få personlig rådgivning baserad på aktuella avtalspriser och marknadsdata för din roll och region. Ange din e-postadress för att komma igång.
            </p>

            <div className="w-full max-w-xs mt-6 space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="din@epost.se"
                  value={gateEmail}
                  onChange={(e) => setGateEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailGate()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleEmailGate}
                disabled={gateLoading}
                className="w-full"
              >
                {gateLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Öppna Löneassistenten"
                )}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/50 mt-4 text-center">
              Helt anonymt · Vi delar aldrig din adress
            </p>

            <p className="text-[11px] text-muted-foreground/60 mt-3 text-center">
              Har du redan ett konto?{" "}
              <Link to="/logga-in" className="text-primary hover:underline font-medium">
                Logga in →
              </Link>
            </p>
          </div>
        ) : (
          <>
            {/* Context bar */}
            {hasContext && (
              <div className="flex-shrink-0 px-4 py-2">
                <ContextBar context={context} onUpdate={updateContext} />
              </div>
            )}

            {/* Messages area */}
            <div ref={scrollRef} className={`overflow-y-auto px-4 ${hasMessages ? "flex-1" : "flex-shrink-0"}`}>
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

            {/* Input */}
            <div className={`flex-shrink-0 px-4 pb-4 pt-2 ${!hasMessages ? "flex-1 flex flex-col justify-end" : ""}`}>
              <ChatInput onSend={send} isLoading={isLoading} expanded={!hasMessages} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
