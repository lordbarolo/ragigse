import { Lock } from "lucide-react";

export default function BlurredRateTeaser() {
  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Blurred fake content */}
      <div className="blur-sm opacity-40 pointer-events-none select-none p-5 bg-card/30">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          Ramavtalspris
        </p>
        <p className="text-3xl font-bold text-foreground">••• kr/h</p>
        <p className="text-xs text-muted-foreground mt-1">
          Grundtimpris enligt ramavtal
        </p>
      </div>
      {/* Overlay CTA */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/80 backdrop-blur-sm px-4 py-2.5 rounded-full border border-primary/30 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-sm font-medium">Ingår i din rapport</span>
        </div>
      </div>
    </div>
  );
}
