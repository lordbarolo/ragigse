import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string | null;
}

const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  complete: {
    label: "Redo",
    icon: CheckCircle2,
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  },
  almost: {
    label: "Nästan klar",
    icon: AlertTriangle,
    className: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  },
  incomplete: {
    label: "Ofullständig",
    icon: XCircle,
    className: "bg-destructive/15 text-destructive border-destructive/30",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const c = config[status || "incomplete"] || config.incomplete;
  const Icon = c.icon;

  return (
    <Badge variant="outline" className={`gap-1.5 px-3 py-1 text-xs font-semibold ${c.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </Badge>
  );
}
