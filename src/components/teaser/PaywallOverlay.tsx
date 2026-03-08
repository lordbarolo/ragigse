import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import ExitIntentReferral from "@/components/ExitIntentReferral";
import { BarRow } from "@/shared/UIComponents";

interface Props {
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
  isUnderpaid: boolean;
  priceKr?: number;
}

export default function PaywallOverlay({
  userHourly, result, customerRate, unlocked, partialUnlocked,
  exitIntentVisible, checkoutLoading, onCheckout, leadId, referrerEmail,
  regionName, onPartialUnlock, isUnderpaid, priceKr = 49,
}: Props) {
  // Use customerRate for "what the region pays" bar, fall back to result.high
  const regionPays = customerRate && customerRate > 0 ? customerRate : result.high;
  const barMax = Math.max(regionPays, result.high, userHourly) + 50;

  return (
    <div className="space-y-4">
      {/* Bars — always visible without overlay */}
      <div className="space-y-4">
        <BarRow
          label="Din nuvarande ersättning"
          value={userHourly}
          max={barMax}
          color="bg-muted-foreground/30"
        />
        <BarRow
          label="Vad regionen betalar bemanningsföretag"
          value={regionPays}
          max={barMax}
          color="bg-primary"
          blurred={true}
        />
        <BarRow
          label="Rekommenderad ersättning"
          value={result.high}
          max={barMax}
          color="bg-primary/50"
          partialReveal={false}
          animateAndBlurAt={userHourly}
        />
      </div>

      {/* Exit intent referral — shown below bars when triggered */}
      {!unlocked && !partialUnlocked && exitIntentVisible && (
        <div className="rounded-lg border border-border bg-card p-4 animate-fade-in card-shadow">
          <ExitIntentReferral
            visible={true}
            leadId={leadId}
            referrerEmail={referrerEmail}
            region={regionName}
            onUnlocked={onPartialUnlock}
            inline
          />
        </div>
      )}

      {unlocked && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Upplåst via referens</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Regionens pris visas. Köp rapporten för fullständig analys med förhandlingstips.
          </p>
        </div>
      )}
    </div>
  );
}
