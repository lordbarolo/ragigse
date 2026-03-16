import { Lock } from "lucide-react";

interface Props {
  onScrollToEmail: () => void;
}

export default function BlurredReportTeaser({ onScrollToEmail }: Props) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred fake content */}
      <div className="blur-sm opacity-40 pointer-events-none space-y-3">
        <div className="p-4 rounded-xl bg-foreground/[0.03]">
           <p className="text-body-sm font-semibold">Ramavtalspris</p>
           <p className="text-2xl font-bold text-foreground">••• kr/h</p>
           <p className="text-hint mt-1">Grundtimpris enligt ramavtal</p>
        </div>
        <div className="p-4 rounded-xl bg-foreground/[0.03]">
           <p className="text-body-sm font-semibold">Förhandlingsspann</p>
           <div className="flex gap-4 mt-1">
             <div>
               <p className="text-hint">Realistiskt</p>
               <p className="text-lg font-bold text-foreground">••• kr</p>
             </div>
             <div>
               <p className="text-hint">Rekommenderat</p>
               <p className="text-lg font-bold text-foreground">••• kr</p>
             </div>
             <div>
               <p className="text-hint">Ambitiöst</p>
              <p className="text-lg font-bold text-foreground">••• kr</p>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center">
        <button
          onClick={onScrollToEmail}
          className="bg-background/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-primary/30 flex items-center gap-2 hover:border-primary/50 transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-sm font-medium">Lås upp full rapport →</span>
        </button>
      </div>
    </div>
  );
}
