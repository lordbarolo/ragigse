import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { NegotiationContext } from "@/hooks/useNegotiationChat";

interface Props {
  context: NegotiationContext;
  onUpdate: (updates: Partial<NegotiationContext>) => void;
}

const labels: Record<string, string> = {
  role: "Roll",
  geography: "Ort",
  employment_type: "Typ",
  current_salary: "Lön",
  current_rate: "Timpris",
  experience_years: "Erfarenhet",
};

const empLabels: Record<string, string> = {
  anstalld: "Anställd",
  foretagare: "Företagare",
};

export default function ContextBar({ context, onUpdate }: Props) {
  const entries = Object.entries(context).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return null;

  const formatValue = (key: string, value: unknown): string => {
    if (key === "employment_type") return empLabels[value as string] ?? String(value);
    if (key === "current_salary" || key === "current_rate") {
      return `${Number(value).toLocaleString("sv-SE")} kr`;
    }
    if (key === "experience_years") return `${value} år`;
    return String(value);
  };

  return (
    <div className="flex flex-wrap gap-1.5 px-1">
      {entries.map(([key, value]) => (
        <Badge
          key={key}
          variant="secondary"
          className="text-[11px] font-medium bg-secondary/80 text-foreground/70 gap-1 pr-1"
        >
          {labels[key] ?? key}: {formatValue(key, value)}
          <button
            onClick={() => onUpdate({ [key]: undefined })}
            className="ml-0.5 hover:text-destructive transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
