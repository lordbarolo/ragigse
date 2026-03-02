import { TrendingDown } from "lucide-react";
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
  employmentType?: string;
}

export default function ConsultantVerdictCard({
  abVariant, isUnderpaid, userHourly, result, unlocked, partialUnlocked,
  exitIntentVisible, checkoutLoading, onCheckout, leadId, referrerEmail,
  regionName, onPartialUnlock, employmentType,
}: Props) {
  const label = employmentType === "foretagare" ? "Din ersättning" : "Din lön";
  if (!isUnderpaid) {
    return (
      <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
        <div className="p-5">
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
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/20 bg-card card-shadow overflow-hidden">
      <div className="bg-destructive/5 border-b border-destructive/10 px-5 py-3 flex items-center gap-3">
        <TrendingDown className="w-4 h-4 text-destructive" />
        <p className="font-semibold text-sm text-foreground">
          Du är sannolikt underbetald enligt offentliga ramavtal.
        </p>
      </div>
      <div className="p-5">
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
      </div>
    </div>
  );
}
