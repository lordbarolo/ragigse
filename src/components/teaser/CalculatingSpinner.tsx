import { useEffect, useState } from "react";
import CompcareLogo from "@/components/CompcareLogo";

export default function CalculatingSpinner() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        // Fast at start, slows down as it approaches 95
        const increment = Math.max(0.5, (95 - prev) * 0.04);
        return Math.min(95, prev + increment);
      });
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const size = 180;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

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
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      <p className="mt-6 text-base font-semibold text-foreground">
        Beräknar din ersättning
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Analyserar marknadsdata...
      </p>
    </div>
  );
}
