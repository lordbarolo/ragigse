import { useEffect, useState, useCallback } from "react";
import CompcareLogo from "@/components/CompcareLogo";
import { trackEvent } from "@/lib/trackEvent";

interface SpinnerQuestion {
  triggerPct: number;
  question: string;
  options: string[];
}

const QUESTIONS: SpinnerQuestion[] = [
  {
    triggerPct: 27,
    question: "Arbetar du som konsult eller har du en fast anställning?",
    options: ["Ja", "Nej"],
  },
  {
    triggerPct: 63,
    question: "Är din arbetsgivare en:",
    options: ["Privat vårdgivare", "Offentlig vårdgivare", "Bemanningsföretag"],
  },
  {
    triggerPct: 92,
    question: "Sker ditt arbete hos:",
    options: ["Region", "Kommun", "Privat"],
  },
];

const TOTAL_DURATION_MS = 12000;
const TICK_MS = 50;

interface CalculatingSpinnerProps {
  /** Whether to show the micro-survey variant */
  showSurvey?: boolean;
}

export default function CalculatingSpinner({ showSurvey = false }: CalculatingSpinnerProps) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(-1);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Progress ticker — 0→100 over ~12s, pauses when a question is shown
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (TOTAL_DURATION_MS / TICK_MS));
        return Math.min(100, next);
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [paused]);

  // Check if we should pause and show a question
  useEffect(() => {
    if (!showSurvey || paused) return;

    for (let i = 0; i < QUESTIONS.length; i++) {
      if (progress >= QUESTIONS[i].triggerPct && answers[i] === undefined && activeQuestionIdx < i) {
        setPaused(true);
        setActiveQuestionIdx(i);
        trackEvent("survey_step_viewed", { spinner_question: i, question: QUESTIONS[i].question });
        break;
      }
    }
  }, [progress, showSurvey, paused, answers, activeQuestionIdx]);

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

  const size = 180;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayPct = Math.min(95, progress);
  const offset = circumference - (displayPct / 100) * circumference;

  const currentQuestion = showSurvey && activeQuestionIdx >= 0 && paused
    ? QUESTIONS[activeQuestionIdx]
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <CompcareLogo variant="wordmark" className="h-7" />
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
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
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary">
            {Math.round(displayPct)}%
          </span>
        </div>
      </div>

      <p className="mt-6 text-base font-semibold text-foreground">
        Beräknar din ersättning
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Analyserar marknadsdata...
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
