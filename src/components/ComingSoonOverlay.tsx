import { Lock } from "lucide-react";

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  label?: string;
}

export default function ComingSoonOverlay({ children, label = "Kommer snart" }: ComingSoonOverlayProps) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/80 backdrop-blur-sm px-5 py-3 shadow-sm">
          <Lock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        </div>
      </div>
    </div>
  );
}
