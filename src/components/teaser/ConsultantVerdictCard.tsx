import PaywallOverlay from "./PaywallOverlay";

interface Props {
  isUnderpaid: boolean;
  userHourly: number;
  result: { low: number; high: number };
  customerRate?: number;
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
  priceKr?: number;
}

export default function ConsultantVerdictCard({
  isUnderpaid, userHourly, result, customerRate, unlocked, partialUnlocked,
  exitIntentVisible, checkoutLoading, onCheckout, leadId, referrerEmail,
  regionName, onPartialUnlock, employmentType,
}: Props) {
  return (
    <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
      <div className="p-5">
        <PaywallOverlay
          userHourly={userHourly}
          result={result}
          customerRate={customerRate}
          unlocked={unlocked}
          partialUnlocked={partialUnlocked}
          exitIntentVisible={exitIntentVisible}
          checkoutLoading={checkoutLoading}
          onCheckout={onCheckout}
          leadId={leadId}
          referrerEmail={referrerEmail}
          regionName={regionName}
          onPartialUnlock={onPartialUnlock}
          isUnderpaid={isUnderpaid}
        />
      </div>
    </div>
  );
}
