import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

interface Props {
  onOpen: () => void;
}

export default function ReferralCta({ onOpen }: Props) {
  return (
    <Card className="card-shadow border-accent/30">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h3 className="font-display text-lg text-foreground">Lås upp konsultlönen — gratis</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Genom att dela en länk med en kollega låser du upp rapporten som visar vad konsulter tjänar i samma roll.
        </p>
        <Button
          onClick={onOpen}
          variant="outline"
          className="w-full border-accent text-accent hover:bg-accent/5"
        >
          <Users className="w-4 h-4 mr-2" />
          Dela med en kollega
        </Button>
      </CardContent>
    </Card>
  );
}
