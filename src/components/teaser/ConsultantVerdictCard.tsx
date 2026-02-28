import { TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PaywallOverlay from "./PaywallOverlay";

interface Props {
  abVariant: string;
  isUnderpaid: boolean;
  userHourly: number;
  result: { low: number; high: number };
  unlocked: boolean;
  partialUnlocked: boolean;
  exitIntentVisible: boolean;
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
  leadId: string;
  referrerEmail: string;
  regionName: string;
  onPartialUnlock: () => void;
}

export default function ConsultantVerdictCard({
  abVariant, isUnderpaid, userHourly, result, unlocked, partialUnlocked,
  exitIntentVisible, checkoutLoading, onCheckout, leadId, referrerEmail,
  regionName, onPartialUnlock,
}: Props) {
  return (
    <Card className="card-shadow border-destructive/30 overflow-hidden">
      <div className="bg-destructive/10 p-4 flex items-center gap-3">
        <TrendingDown className="w-5 h-5 text-destructive" />
        <p className="font-semibold text-foreground">
          {abVariant === "B"
            ? "Du är sannolikt underbetald enligt offentliga ramavtal."
            : isUnderpaid
              ? "Din lön ligger under marknadspris"
              : "Din lön ligger nära marknadspris"}
        </p>
      </div>
      <CardContent className="pt-6">
        <PaywallOverlay
          userHourly={userHourly}
          result={result}
          unlocked={unlocked}
          partialUnlocked={partialUnlocked}
          exitIntentVisible={exitIntentVisible}
          checkoutLoading={checkoutLoading}
          onCheckout={onCheckout}
          leadId={leadId}
          referrerEmail={referrerEmail}
          regionName={regionName}
          onPartialUnlock={onPartialUnlock}
          abVariant={abVariant}
          isUnderpaid={isUnderpaid}
        />
      </CardContent>
    </Card>
  );
}
