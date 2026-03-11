import { Users, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";

interface Props {
  occupation: string;
  percentilePosition: number;
}

export default function ColleagueComparison({ occupation, percentilePosition }: Props) {
  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-5 sm:p-6 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent" />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <Users className="w-4.5 h-4.5 text-accent" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-foreground">
          Hur ligger dina kollegor till?
        </h3>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Skicka analysen till en kollega och jämför era ersättningar. Ju fler som
        gör analysen, desto bättre data för alla.
      </p>

      {percentilePosition > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20 mb-4">
          <div className="text-2xl font-bold text-accent tabular-nums">
            {percentilePosition}%
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Du ligger över {percentilePosition} % av användarna som gjort analysen.
          </p>
        </div>
      )}

      <ShareButton
        title="CompCare.se – Ersättningsanalys"
        text={`Kolla din ersättning som ${occupation} — jag har just gjort det med CompCare.se`}
        url={window.location.origin}
        className="w-full"
      />
    </div>
  );
}
