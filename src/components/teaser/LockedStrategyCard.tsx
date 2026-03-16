import { useEffect, useRef } from "react";
import { Lock, BarChart3, Users, FileText } from "lucide-react";
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
        { icon: BarChart3, text: "Fullständig marknadsjämförelse" },
        { icon: Users, text: "Vad kollegor i din yrkesgrupp tjänar" },
        { icon: FileText, text: "Detaljerad data per percentil" },
      ]
    : [
        { icon: BarChart3, text: "Fullständig marknadsjämförelse" },
        { icon: Users, text: "Konsultmarknadens ersättningsspann" },
        { icon: FileText, text: "Vad andra i din roll tjänar" },
      ];

  return (
    <div className="rounded-xl border border-border bg-card card-shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <p className="text-caption">
            Din fullständiga analys
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

      </div>
    </div>
  );
}
