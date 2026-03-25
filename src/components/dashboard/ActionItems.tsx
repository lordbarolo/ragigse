import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, UserPlus, FileCheck, Loader2 } from "lucide-react";
import type { ActionItem } from "@/hooks/useActionItems";

const actionConfig: Record<string, { label: string; cta: string; icon: React.ElementType }> = {
  missing_reference: {
    label: "Lägg till minst 2 kvalificerade referenser",
    cta: "Bjud in referens",
    icon: UserPlus,
  },
  add_ivo: {
    label: "Ladda upp IVO-utdrag för verifiering",
    cta: "Ladda upp IVO",
    icon: FileCheck,
  },
  add_hosp: {
    label: "Ladda upp HOSP-utdrag för verifiering",
    cta: "Ladda upp HOSP",
    icon: FileCheck,
  },
};

interface ActionItemsProps {
  actions: ActionItem[];
  loading: boolean;
  onAction: (type: string) => void;
}

export function ActionItems({ actions, loading, onAction }: ActionItemsProps) {
  if (loading) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (actions.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          {actions.length} {actions.length === 1 ? "sak kräver" : "saker kräver"} din åtgärd
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => {
          const cfg = actionConfig[action.type] || {
            label: action.type,
            cta: "Åtgärda",
            icon: AlertCircle,
          };
          const Icon = cfg.icon;
          return (
            <div
              key={action.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-background/80 p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-foreground">{cfg.label}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(action.type)} className="shrink-0">
                {cfg.cta}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
