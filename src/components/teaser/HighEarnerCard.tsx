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
          Din ersättning ligger i marknadens övre skikt för din zon
        </p>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-body-sm leading-relaxed">
          Din ersättning i {kommun} ligger på 96% eller mer av vad regionen betalar till bemanningsföretag enligt ramavtalet.
        </p>

        <div className="space-y-3">
          <p className="text-caption">
            Ytterligare datapunkter
          </p>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Andra priszoner</p>
                <p className="text-hint mt-0.5">
                  {nearestHigherKommun
                    ? `I t.ex. ${nearestHigherKommun} gäller ett högre ramavtalspris för samma roll. Andra zoner har andra ramavtalspriser.`
                    : "Vissa kommuner och regioner har högre ramavtalspriser för samma roll."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Jourersättning</p>
                <p className="text-hint mt-0.5">
                  Jour- och beredskapstillägg ligger utanför grundtimpriset och kan ge ett betydande påslag på din totala ersättning.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
              <Car className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Reseersättning</p>
                <p className="text-hint mt-0.5">
                  Om uppdraget kräver resa finns ofta reseersättning, boende och traktamente utöver grundtimpriset.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
