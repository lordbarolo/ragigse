import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function BetaAssumptionBadge({ explanation }: { explanation: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Antagande: ${explanation}`}
        >
          Antagande <Info className="h-3 w-3" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{explanation}</TooltipContent>
    </Tooltip>
  );
}
