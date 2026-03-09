import { useEffect, useRef } from "react";
import { Lock, TrendingUp, Users, FileText } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  isPermanent: boolean;
}

export default function LockedStrategyCard({ isPermanent }: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("email_gate_viewed" as any, { is_permanent: isPermanent });
    }
  }, []);

  const items = isPermanent
    ? [
        { icon: TrendingUp, text: "Hur du kan förhandla upp din lön" },
        { icon: Users, text: "Vad kollegor i din yrkesgrupp tjänar" },
        { icon: FileText, text: "Steg-för-steg förhandlingsguide" },
      ]
    : [
        { icon: TrendingUp, text: "Hur du kan förhandla upp din ersättning" },
        { icon: Users, text: "Din möjliga konsultintäkt" },
        { icon: FileText, text: "Vad andra i din roll tjänar" },
      ];

  return (
    <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ditt personliga nästa steg
          </p>
        </div>

        <div className="space-y-3">
          {items.map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">{text}</p>
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="mt-5 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-8 h-1.5 rounded-full bg-primary" />
            <div className="w-8 h-1.5 rounded-full bg-primary/30" />
            <div className="w-8 h-1.5 rounded-full bg-muted" />
          </div>
          <span className="text-xs text-muted-foreground font-medium">Steg 2 av 3</span>
        </div>
      </div>
    </div>
  );
}
