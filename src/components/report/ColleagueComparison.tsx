import { Users } from "lucide-react";
import ShareButton from "@/components/ShareButton";

interface Props {
  occupation: string;
  percentilePosition: number;
}

export default function ColleagueComparison({ occupation, percentilePosition }: Props) {
  return (
    <div>
      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-micro font-semibold tracking-[1.4px] uppercase">
          Kollegajämförelse
        </span>
        <div className="flex-1 h-px bg-foreground/[0.06]" />
      </div>

      <div className="rounded-2xl bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground/80">
              Hur ligger dina kollegor till?
            </h3>
          </div>

          <p className="text-hint leading-relaxed mb-4">
            Skicka analysen till en kollega och jämför era ersättningar.
          </p>
        </div>


        {/* CTA */}
        <div className="p-4 pt-0">
          <ShareButton
            title="CompCare.se – Ersättningsanalys"
            text={`Hur stor är egentligen skillnaden mellan konsult och fast tjänst? Se din ersättning mot marknaden.`}
            url={`${window.location.origin}/dela?yrke=${encodeURIComponent(occupation)}`}
            className="w-full"
            label="Dela analys"
          />
        </div>
      </div>
    </div>
  );
}
