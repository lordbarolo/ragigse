import { CheckCircle, MapPin, Clock, Car } from "lucide-react";

interface Props {
  kommun: string;
  nearestHigherKommun?: string | null;
}

export default function HighEarnerCard({ kommun, nearestHigherKommun }: Props) {
  return (
    <div className="rounded-lg border border-primary/20 bg-card card-shadow overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-3 flex items-center gap-3">
        <CheckCircle className="w-4 h-4 text-primary" />
        <p className="font-semibold text-sm text-foreground">
          Du ligger redan i toppskiktet för din zon
        </p>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Din ersättning i {kommun} ligger på 96% eller mer av vad regionen betalar till bemanningsföretag enligt ramavtalet. Det innebär att det i praktiken inte finns ytterligare förhandlingsutrymme i din nuvarande zon.
        </p>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Så kan du öka din ersättning
          </p>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Byt till en högre priszon</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {nearestHigherKommun
                    ? `I t.ex. ${nearestHigherKommun} betalas ett högre timpris för samma roll. Överväg uppdrag i en annan zon för att öka din ersättning.`
                    : "Vissa kommuner och regioner har högre ramavtalspriser. Överväg uppdrag i en annan zon."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Jourersättning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Jour- och beredskapstillägg ligger utanför grundtimpriset och kan ge ett betydande påslag på din totala ersättning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Reseersättning</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Om uppdraget kräver resa finns ofta möjlighet att förhandla reseersättning, boende och traktamente utöver grundtimpriset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
