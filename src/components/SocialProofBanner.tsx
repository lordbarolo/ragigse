import { Users } from "lucide-react";

export default function SocialProofBanner() {
  return (
    <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-accent/5 border border-accent/15 rounded-lg text-xs text-muted-foreground">
      <Users className="w-3.5 h-3.5 text-accent shrink-0" />
      <span>Används av <span className="font-semibold text-foreground">2 000+</span> vårdkonsulter</span>
    </div>
  );
}
