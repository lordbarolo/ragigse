import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Mail, Loader2, Flag, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLonekollAnswer } from "@/hooks/useLonekollAnswer";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { LONEKOLL_TOPICS, type LonekollTopic, type LonekollQuestion } from "@/data/lonekollQuestions";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";

const PAGE_TITLE = "Lönekoll — CompCare";
const PAGE_DESC = "Få snabba svar på dina förhandlingsfrågor — baserat på SKR-ramavtalet och din roll.";

export default function Negotiate() {
  const { user, loading: authLoading } = useAuth();
  const { answer, loading: answerLoading, error: answerError, context, ask, reset } = useLonekollAnswer();

  // Selection state
  const [activeTopic, setActiveTopic] = useState<LonekollTopic | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<LonekollQuestion | null>(null);

  // Email gate state
  const [emailGateUnlocked, setEmailGateUnlocked] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateLoading, setGateLoading] = useState(false);

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [missingQuestionOpen, setMissingQuestionOpen] = useState(false);
  const [missingQuestionText, setMissingQuestionText] = useState("");

  const navigate = useNavigate();
  const answerScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = PAGE_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", PAGE_DESC);
    trackEvent("product_page_viewed", { product: "lonekoll" });
  }, []);

  useEffect(() => {
    if (answer) {
      answerScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [answer]);

  const handleEmailGate = async () => {
    const trimmed = gateEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Ange en giltig e-postadress.");
      return;
    }
    setGateLoading(true);
    try {
      await supabase.functions.invoke("save-email", {
        body: { email: trimmed, source: "lonekoll_gate" },
      });
      trackEvent("lonekoll_email_gate_completed", { email: trimmed });
      setEmailGateUnlocked(true);
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setGateLoading(false);
    }
  };

  const handleSelectTopic = (topic: LonekollTopic) => {
    setActiveTopic(topic);
    setActiveQuestion(null);
    reset();
    trackEvent("lonekoll_topic_selected", { topic_id: topic.id });
  };

  const handleSelectQuestion = (question: LonekollQuestion) => {
    if (!activeTopic) return;
    setActiveQuestion(question);
    trackEvent("lonekoll_question_selected", { topic_id: activeTopic.id, question_id: question.id });
    ask(activeTopic.id, question.id);
  };

  const handleBackToQuestions = () => {
    setActiveQuestion(null);
    reset();
  };

  const handleBackToMenu = () => {
    setActiveTopic(null);
    setActiveQuestion(null);
    reset();
  };

  const handleReportSubmit = async () => {
    if (!reportText.trim()) {
      toast.error("Beskriv vad som var fel.");
      return;
    }
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("chat_answer_reports").insert([{
        message_content: answer || "(inget svar)",
        context_json: {
          topicId: activeTopic?.id,
          questionId: activeQuestion?.id,
          reason: reportText,
          ...(context as object || {}),
        },
        user_email: user?.email || gateEmail || null,
        page_url: window.location.href,
      }]);
      if (error) throw error;
      trackEvent("lonekoll_answer_reported", { topic_id: activeTopic?.id, question_id: activeQuestion?.id });
      toast.success("Tack! Vi har tagit emot din rapportering.");
      setReportText("");
      setReportOpen(false);
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleMissingQuestionSubmit = async () => {
    if (!missingQuestionText.trim()) {
      toast.error("Beskriv din fråga kort.");
      return;
    }
    setReportSubmitting(true);
    try {
      const { error } = await supabase.from("chat_answer_reports").insert([{
        message_content: "(missing_question)",
        context_json: {
          category: "missing_question",
          question: missingQuestionText,
          topicId: activeTopic?.id ?? null,
        },
        user_email: user?.email || gateEmail || null,
        page_url: window.location.href,
      }]);
      if (error) throw error;
      trackEvent("lonekoll_missing_question_reported");
      toast.success("Tack! Vi tar med din fråga i nästa uppdatering.");
      setMissingQuestionText("");
      setMissingQuestionOpen(false);
    } catch {
      toast.error("Något gick fel. Försök igen.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const hasAccess = !!user || emailGateUnlocked;

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-secondary/30 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-secondary/30 flex flex-col overflow-hidden">
      <div className="w-full bg-background flex flex-col overflow-hidden flex-1 min-h-0">
        {/* Header */}
        <nav className="flex items-center justify-between px-4 h-[52px] flex-shrink-0 border-b border-border/50">
          <div className="flex items-center gap-3">
            {activeTopic ? (
              <button
                onClick={activeQuestion ? handleBackToQuestions : handleBackToMenu}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Tillbaka"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            ) : (
              <Link
                to="/"
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </Link>
            )}
            <div>
              <span className="font-display font-bold text-foreground text-sm tracking-tight">
                Lönekoll
              </span>
              <span className="text-[10px] text-muted-foreground ml-2 font-medium">
                {activeTopic ? activeTopic.title : "Förhandlingsstöd för bemanning"}
              </span>
            </div>
          </div>
          {answer && hasAccess && (
            <button
              onClick={() => setReportOpen(true)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 transition-colors"
              title="Rapportera felaktigt svar"
            >
              <Flag className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
            </button>
          )}
        </nav>

        {!hasAccess ? (
          /* ── Email Gate ── */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground tracking-tight text-center">
              Lönekoll
            </h1>
            <p className="text-sm text-muted-foreground mt-2 text-center max-w-sm leading-relaxed">
              Få snabba svar på dina förhandlingsfrågor — baserat på SKR-ramavtalet och din roll. Ange din e-post för att komma igång.
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
                className="w-full text-sm font-semibold px-6 py-3 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070] text-white border-0 hover:opacity-90"
              >
                {gateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Öppna Lönekoll"}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-4 text-center">
              Helt anonymt · Vi delar aldrig din adress
            </p>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Har du redan ett konto?{" "}
              <Link to="/logga-in" className="text-primary hover:underline font-medium">
                Logga in →
              </Link>
            </p>
          </div>
        ) : (
          <div ref={answerScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 min-h-0">
            {/* ── Menu view ── */}
            {!activeTopic && (
              <div className="max-w-md mx-auto space-y-4">
                <div className="text-center mb-2">
                  <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
                    Vad vill du veta?
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">
                    Välj ett ämne nedan. Alla svar bygger på SKR-ramavtalet och CompCares marginalmodeller.
                  </p>
                </div>
                {LONEKOLL_TOPICS.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-secondary/30 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">{topic.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground">{topic.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{topic.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => setMissingQuestionOpen(true)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors pt-2 pb-4"
                >
                  Saknar du din fråga? Skicka in den →
                </button>
              </div>
            )}

            {/* ── Subquestion view ── */}
            {activeTopic && !activeQuestion && (
              <div className="max-w-md mx-auto space-y-3">
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{activeTopic.title}</p>
                  <h2 className="font-display text-base font-bold text-foreground mt-0.5">Välj din fråga</h2>
                </div>
                {activeTopic.questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleSelectQuestion(q)}
                    className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-secondary/30 transition-all flex items-center justify-between gap-3 group"
                  >
                    <span className="text-sm text-foreground">{q.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Answer view ── */}
            {activeTopic && activeQuestion && (
              <div className="max-w-md mx-auto">
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{activeTopic.title}</p>
                  <h2 className="font-display text-base font-bold text-foreground mt-0.5">{activeQuestion.label}</h2>
                </div>

                {answerLoading && (
                  <div className="bg-card border border-border rounded-2xl px-4 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Hämtar svar…
                  </div>
                )}

                {answerError && (
                  <div className="bg-destructive/5 border border-destructive/30 rounded-2xl px-4 py-3 text-sm text-destructive">
                    {answerError}
                  </div>
                )}

                {answer && !answerLoading && (
                  <div className="bg-card border border-border rounded-2xl px-4 py-4">
                    <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-ul:my-2 prose-p:my-2">
                      <ReactMarkdown>{answer}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {answer && !answerLoading && answer.includes("Komplettera i din profil eller gör en lönekoll först.") && (
                  <div className="mt-6">
                    <p className="text-xs text-muted-foreground mb-3">
                      Fyll i uppgifterna nedan så kan vi ge dig ett personligt svar:
                    </p>
                    <InlineTerminalSurvey
                      onComplete={(leadId) => navigate(`/resultat/${leadId}`)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-5">
                  <Button
                    variant="outline"
                    onClick={handleBackToQuestions}
                    className="text-sm font-semibold px-6 py-3"
                  >
                    ← Tillbaka till frågor
                  </Button>
                  <button
                    onClick={handleBackToMenu}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    ← Tillbaka till menyn
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rapportera felaktigt svar</DialogTitle>
            <DialogDescription>Beskriv kort vad som var fel.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="T.ex. timersättningen stämmer inte för min zon..."
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>Avbryt</Button>
            <Button size="sm" onClick={handleReportSubmit} disabled={reportSubmitting}>
              {reportSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Skicka
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Missing question dialog */}
      <Dialog open={missingQuestionOpen} onOpenChange={setMissingQuestionOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Saknar du din fråga?</DialogTitle>
            <DialogDescription>
              Skriv din fråga så lägger vi till den i nästa uppdatering om den passar Lönekolls scope.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="T.ex. Vad gäller vid uppdrag på privat vårdcentral?"
            value={missingQuestionText}
            onChange={(e) => setMissingQuestionText(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setMissingQuestionOpen(false)}>Avbryt</Button>
            <Button size="sm" onClick={handleMissingQuestionSubmit} disabled={reportSubmitting}>
              {reportSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Skicka
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
