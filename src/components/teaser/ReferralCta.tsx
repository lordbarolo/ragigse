import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface Props {
  onOpen: () => void;
}

export default function ReferralCta({ onOpen }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card card-shadow p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Lås upp konsultlönen — gratis</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Genom att tipsa en kollega om sidan låser du upp rapporten som visar vad konsulter tjänar i samma roll.
      </p>
      <Button
        onClick={onOpen}
        variant="outline"
        className="w-full border-primary/30 text-primary hover:bg-primary/5"
      >
        <Users className="w-4 h-4 mr-2" />
        Tipsa en kollega
      </Button>
    </div>
  );
}
