import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2, RefreshCw } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { captureError } from "@/lib/posthog";
import {
  HOME_QUESTIONS,
  resolveHomeAnswer,
  type HomeAnswer,
  type HomeQuestion,
} from "@/components/chat/homeAssistantQuestions";

interface UserTurn {
  kind: "user";
  id: string;
  text: string;
}

interface AnswerTurn {
  kind: "answer";
  id: string;
  question: HomeQuestion;
  answer: HomeAnswer;
}

type Turn = UserTurn | AnswerTurn;

const CHIP_CLASS =
  "text-left text-[12.5px] leading-snug px-[13px] py-[9px] rounded-[9px] border border-white/[0.12] " +
  "bg-white/[0.02] text-[#c2c5d4] transition-colors hover:border-white/30 hover:bg-white/[0.06] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b5bf0] focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[#151823] disabled:opacity-40 disabled:cursor-not-allowed";

export default function HomeAssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ question: HomeQuestion; message: string } | null>(null);
  const loginPromptTracked = useRef(false);
  const turnCounter = useRef(0);

  useEffect(() => {
    trackEvent("home_chat_shown");
  }, []);

  // Logga att inloggningsuppmaningen visats — en gång per session, efter första svaret.
  useEffect(() => {
    if (turns.some((t) => t.kind === "answer") && !loginPromptTracked.current) {
      loginPromptTracked.current = true;
      trackEvent("home_chat_login_prompt_shown");
    }
  }, [turns]);

  const ask = async (question: HomeQuestion) => {
    if (pendingId) return;

    trackEvent("home_chat_question_clicked", { question_id: question.id });
    setFailed(null);

    const turnId = `${question.id}-${turnCounter.current++}`;
    setTurns((prev) => [...prev, { kind: "user", id: turnId, text: question.label }]);
    setPendingId(turnId);

    const startedAt = Date.now();
    try {
      const answer = await resolveHomeAnswer(question.id);
      setTurns((prev) => [...prev, { kind: "answer", id: `${turnId}-a`, question, answer }]);
      trackEvent("home_chat_answer_shown", {
        question_id: question.id,
        latency_ms: Date.now() - startedAt,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Okänt fel";
      setFailed({ question, message });
      trackEvent("home_chat_answer_failed", {
        question_id: question.id,
        reason: message.slice(0, 120),
      });
      captureError(err, { scope: "home_assistant", question_id: question.id });
    } finally {
      setPendingId(null);
    }
  };

  const hasAnswer = turns.some((t) => t.kind === "answer");

  return (
    <div className="relative mx-auto w-full max-w-[720px] px-6 pb-[26px] animate-cc-fade-up [animation-duration:0.8s] [animation-delay:0.2s] motion-reduce:animate-none">
      <div
        className="rounded-[18px] border border-[#7a7ff2]/35 bg-[#151823]/[0.92] p-6 text-left shadow-[0_30px_80px_rgba(0,0,0,.5)] backdrop-blur-lg"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.03)" }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <span
            className="grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)" }}
            aria-hidden="true"
          >
            C
          </span>
          <span className="text-[13px] font-semibold text-[#eef0f4]">CompCare-assistenten</span>
          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-[#6ee7b7]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7b7] animate-cc-dot-pulse motion-reduce:animate-none" />
            online
          </span>
        </div>

        {/* Konversation */}
        <div className="mb-4 space-y-3">
          <p className="rounded-[4px_14px_14px_14px] bg-white/[0.06] px-4 py-[13px] text-sm leading-[1.55] text-[#d6d8e4] animate-cc-fade-up [animation-duration:0.5s] [animation-delay:0.5s] motion-reduce:animate-none">
            Hej! Jag är din CompCare-assistent. Välj en fråga så svarar jag utifrån SKR:s ramavtal
            och publicerade avrop.
          </p>

          {turns.map((turn) =>
            turn.kind === "user" ? (
              <p
                key={turn.id}
                className="ml-auto max-w-[85%] rounded-[14px_4px_14px_14px] bg-[#5b5bf0]/20 px-4 py-[11px] text-[13.5px] leading-[1.5] text-[#e4e6f0]"
              >
                {turn.text}
              </p>
            ) : (
              <div
                key={turn.id}
                className="rounded-[4px_14px_14px_14px] bg-white/[0.06] px-4 py-[13px]"
              >
                {turn.answer.paragraphs.map((paragraph, i) => (
                  <p
                    key={i}
                    className={`text-sm leading-[1.55] text-[#d6d8e4] ${i > 0 ? "mt-2.5" : ""}`}
                  >
                    {paragraph}
                  </p>
                ))}
                <p className="mt-3 font-plex text-[10.5px] uppercase tracking-[0.08em] text-[#666b7e]">
                  {turn.answer.source}
                </p>
                {turn.answer.cta && (
                  <Link
                    to={turn.answer.cta.to}
                    onClick={() =>
                      trackEvent("home_chat_signup_from_chat", { question_id: turn.question.id })
                    }
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9da0f5] underline-offset-4 hover:underline"
                  >
                    {turn.answer.cta.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                )}
              </div>
            )
          )}

          {pendingId && (
            <p
              className="flex items-center gap-2 rounded-[4px_14px_14px_14px] bg-white/[0.06] px-4 py-[13px] text-sm text-[#a3a7b7]"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
              Läser ramavtalet…
            </p>
          )}

          {failed && (
            <div
              className="rounded-[4px_14px_14px_14px] border border-[#f0a5a5]/25 bg-[#f0a5a5]/[0.07] px-4 py-[13px]"
              role="alert"
            >
              <p className="text-sm leading-[1.55] text-[#e8c9c9]">
                Jag kunde inte hämta svaret just nu. Det är ett tillfälligt fel — inte att data
                saknas.
              </p>
              <button
                type="button"
                onClick={() => ask(failed.question)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9da0f5] hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                Försök igen
              </button>
            </div>
          )}
        </div>

        {/* Frågechips */}
        <div className="mb-[18px] grid grid-cols-1 gap-2 sm:grid-cols-2">
          {HOME_QUESTIONS.map((question, i) => (
            <button
              key={question.id}
              type="button"
              onClick={() => ask(question)}
              disabled={pendingId !== null}
              className={`${CHIP_CLASS} ${question.fullWidth ? "sm:col-span-2" : ""} animate-cc-fade-up motion-reduce:animate-none`}
              style={{ animationDuration: "0.4s", animationDelay: `${0.65 + i * 0.08}s` }}
            >
              {question.label}
            </button>
          ))}
        </div>

        {/* Fritextfält — låst tills inloggning */}
        <Link
          to="/logga-in"
          aria-label="Logga in för att ställa egna frågor"
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.14] bg-[#0d0f15] py-[9px] pl-4 pr-[9px] transition-colors hover:border-[#5b5bf0]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5b5bf0]"
        >
          <span className="flex-1 text-sm text-[#666b7e]">
            Ställ din egen fråga…
            <span className="ml-0.5 inline-block h-[15px] w-[1.5px] -mb-0.5 bg-[#8b8bf6] animate-cc-caret motion-reduce:animate-none" />
          </span>
          <span
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] text-white"
            style={{ background: "linear-gradient(140deg,#5b5bf0,#8b8bf6)" }}
            aria-hidden="true"
          >
            <ArrowUp className="h-4 w-4" />
          </span>
        </Link>

        {hasAnswer && (
          <p className="mt-3 text-center text-[12px] text-[#8c90a0]">
            <Link to="/logga-in" className="text-[#9da0f5] underline-offset-4 hover:underline">
              Logga in
            </Link>{" "}
            för att ställa egna frågor.
          </p>
        )}
      </div>

      {/* Förtroendemarkörer */}
      <div className="mt-5 flex flex-wrap justify-center gap-x-[22px] gap-y-2 text-[12.5px] text-[#8c90a0]">
        <span className="flex items-center gap-[7px]">
          <span className="text-[#6ee7b7]" aria-hidden="true">
            ✓
          </span>
          Baserat på SKR:s offentliga ramavtalspriser
        </span>
        <span className="flex items-center gap-[7px]">
          <span className="text-[#6ee7b7]" aria-hidden="true">
            ✓
          </span>
          Branschens standardmarginaler — ca 12 % läkare, 17 % sjuksköterskor
        </span>
      </div>

      <p className="mt-3 pb-7 text-center text-[11.5px] text-[#565b6e]">
        Data lagras inom EU · Vi delar aldrig dina uppgifter. Se{" "}
        <Link to="/integritetspolicy" className="underline">
          integritetspolicyn
        </Link>
        .
      </p>
    </div>
  );
}
