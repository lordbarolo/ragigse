import { useEffect, useState, useCallback, useRef } from "react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

interface SpinnerQuestion {
  /** Seconds from start (cumulative, excluding pause time) when this question triggers */
  triggerAtSec: number;
  /** Progress % to show when pausing */
  pausePct: number;
  question: string;
  options: string[];
  /** Status text shown while progressing toward this question */
  statusText: string;
}

const QUESTIONS: SpinnerQuestion[] = [
  {
    triggerAtSec: 5,
    pausePct: 27,
    question: "Arbetar du som konsult eller har du en fast anställning?",
    options: ["Ja", "Nej"],
    statusText: "Jämför mot 21 regioner...",
  },
  {
    triggerAtSec: 10, // 5s after Q1 answered
    pausePct: 63,
    question: "Är din arbetsgivare en:",
    options: ["Privat vårdgivare", "Offentlig vårdgivare", "Bemanningsföretag"],
    statusText: "Jämför mot 290 kommuner...",
  },
  {
    triggerAtSec: 17, // 7s after Q2 answered
    pausePct: 92,
    question: "Sker ditt arbete hos:",
    options: ["Region", "Kommun", "Privat"],
    statusText: "Jämför med andra i samma roll...",
  },
];

// Total animation time = 5 + 5 + 7 + 3 = 20s of active ticking
const TOTAL_ACTIVE_SEC = 20;
const TICK_MS = 50;

interface CalculatingSpinnerProps {
  showSurvey?: boolean;
}

export default function CalculatingSpinner({ showSurvey = false }: CalculatingSpinnerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(-1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const pausedTimeRef = useRef(0); // total ms spent paused (not counted)
  const lastQuestionShown = useRef(-1);

  // Tick elapsed time (only when not paused)
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setElapsedMs((prev) => prev + TICK_MS);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [paused]);

  // Compute active seconds (elapsed minus paused time)
  const activeSec = elapsedMs / 1000;

  // Compute progress percentage based on active time
  const rawPct = Math.min(100, (activeSec / TOTAL_ACTIVE_SEC) * 100);

  // Check if we should pause for a question
  useEffect(() => {
    if (!showSurvey || paused) return;

    for (let i = 0; i < QUESTIONS.length; i++) {
      if (
        activeSec >= QUESTIONS[i].triggerAtSec &&
        answers[i] === undefined &&
        lastQuestionShown.current < i
      ) {
        setPaused(true);
        setActiveQuestionIdx(i);
        lastQuestionShown.current = i;
        trackEvent("survey_step_viewed", { spinner_question: i, question: QUESTIONS[i].question });
        break;
      }
    }
  }, [activeSec, showSurvey, paused, answers]);

  const handleAnswer = useCallback((questionIdx: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionIdx]: answer }));
    trackEvent("survey_step_completed", {
      spinner_question: questionIdx,
      question: QUESTIONS[questionIdx].question,
      answer,
      variant: "spinner_survey",
    });
    setPaused(false);
  }, []);

  // Determine current status text
  const getStatusText = () => {
    if (!showSurvey) return "Analyserar marknadsdata...";
    // Find which segment we're in
    if (activeSec < QUESTIONS[0].triggerAtSec) return QUESTIONS[0].statusText;
    if (activeSec < QUESTIONS[1].triggerAtSec) return QUESTIONS[1].statusText;
    if (activeSec < QUESTIONS[2].triggerAtSec) return QUESTIONS[2].statusText;
    return "Sammanställer din rapport...";
  };

  const size = 180;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Cap display at 95% visually, and snap to question pausePct when paused
  let displayPct = Math.min(95, rawPct);
  if (paused && activeQuestionIdx >= 0) {
    displayPct = QUESTIONS[activeQuestionIdx].pausePct;
  }

  const offset = circumference - (displayPct / 100) * circumference;

  const currentQuestion =
    showSurvey && activeQuestionIdx >= 0 && paused
      ? QUESTIONS[activeQuestionIdx]
      : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <CompcareLogo variant="wordmark" className="h-7" />
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-100 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary">
            {Math.round(displayPct)}%
          </span>
        </div>
      </div>

      <p className="mt-6 text-base font-semibold text-foreground">
        Beräknar din ersättning
      </p>
      <p className="mt-1 text-sm text-muted-foreground transition-opacity duration-300">
        {getStatusText()}
      </p>

      {/* Micro-survey question overlay */}
      {currentQuestion && (
        <div className="mt-8 w-full max-w-sm animate-fade-in">
          <p className="text-sm font-semibold text-foreground text-center mb-4">
            {currentQuestion.question}
          </p>
          <div className="flex flex-col gap-2">
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(activeQuestionIdx, opt)}
                className="w-full py-3 px-4 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent hover:border-primary transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
