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
}

export default function PaywallOverlay({
  userHourly,
  result,
  customerRate,
  unlocked,
  partialUnlocked,
  exitIntentVisible,
  checkoutLoading,
  onCheckout,
  leadId,
  referrerEmail,
  regionName,
  onPartialUnlock,
  isUnderpaid,
}: Props) {
  // Use customerRate for "what the region pays" bar, fall back to result.high
  const regionPays = customerRate && customerRate > 0 ? customerRate : result.high;
  const barMax = Math.max(regionPays, result.high, userHourly) + 50;

  return (
    <div className="space-y-4">
      {/* Bars with lock overlay */}
      <div className="relative">
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
            blurred={true}
            partialReveal={false}
          />
        </div>

        {!unlocked && !partialUnlocked && !exitIntentVisible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="backdrop-blur-md bg-card/80 rounded-lg p-6 text-center border border-border shadow-lg max-w-xs w-full">
              <Lock className="w-7 h-7 text-primary mx-auto mb-2" />
              <p className="font-bold text-foreground text-sm">Lås upp full analys</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Se exakta siffror och förhandlingstips
              </p>
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => onCheckout("single")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-70"
              >
                {checkoutLoading === "single" ? "Laddar..." : `Köp rapport — ${priceKr} kr`}
                {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
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
