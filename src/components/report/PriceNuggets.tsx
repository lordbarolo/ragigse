import { usePriceNuggets, type PriceNugget } from "@/hooks/usePriceNuggets";
import { TrendingUp, TrendingDown, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const icons: Record<string, React.ReactNode> = {
  increase: <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />,
  decrease: <TrendingDown className="w-4 h-4 text-green-500 shrink-0" />,
  info: <Info className="w-4 h-4 text-blue-500 shrink-0" />,
  new: <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />,
};

const badgeVariant: Record<string, string> = {
  increase: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  decrease: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  new: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
};

function NuggetCard({ nugget }: { nugget: PriceNugget }) {
  const meta = nugget.metadata as Record<string, any> | null;
  const diffPct = meta?.diff_pct;

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <div className="mt-0.5">{icons[nugget.change_type] || icons.info}</div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-semibold leading-tight">{nugget.title}</span>
          {diffPct != null && (
            <Badge variant="outline" className={`text-xs shrink-0 ${badgeVariant[nugget.change_type] || ""}`}>
              {diffPct > 0 ? "+" : ""}{diffPct}%
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{nugget.description}</p>
      </div>
    </div>
  );
}

interface Props {
  category?: string;
  maxItems?: number;
  className?: string;
}

export default function PriceNuggets({ category, maxItems = 3, className = "" }: Props) {
  const { nuggets, loading } = usePriceNuggets(category);

  if (loading || nuggets.length === 0) return null;

  const shown = nuggets.slice(0, maxItems);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Senaste avtalsändringar</span>
      </div>
      {shown.map((n) => (
        <NuggetCard key={n.id} nugget={n} />
      ))}
    </div>
  );
}
