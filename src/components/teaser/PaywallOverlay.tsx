import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import ExitIntentReferral from "@/components/ExitIntentReferral";
import { BarRow } from "@/shared/UIComponents";

interface Props {
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
  abVariant: string;
  isUnderpaid: boolean;
}

export default function PaywallOverlay({
  userHourly,
  result,
  unlocked,
  partialUnlocked,
  exitIntentVisible,
  checkoutLoading,
  onCheckout,
  leadId,
  referrerEmail,
  regionName,
  onPartialUnlock,
  abVariant,
  isUnderpaid,
}: Props) {
  return (
    <div className="relative">
      <div className="space-y-4">
        <BarRow
          label="Din nuvarande lön"
          value={userHourly}
          max={result.high + 50}
          color="bg-muted-foreground/30"
        />
        <BarRow
          label="Marknadspris (ramavtal)"
          value={result.high}
          max={result.high + 50}
          color="bg-primary"
          blurred={true}
        />
        <BarRow
          label="Rekommenderad lön"
          value={result.low}
          max={result.high + 50}
          color="bg-primary/50"
          blurred={true}
          partialReveal={false}
        />
      </div>

      {!unlocked && !partialUnlocked && (
        <div className="absolute inset-0 top-[40px] flex items-start justify-center pt-2">
          {!exitIntentVisible ? (
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
                {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
                {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
              </button>
              <button
                data-cta
                disabled={checkoutLoading !== null}
                onClick={() => onCheckout("yearly")}
                className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg font-medium text-xs border border-border text-foreground hover:bg-muted transition-all disabled:opacity-70"
              >
                {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
              </button>
            </div>
          ) : (
            <div className="backdrop-blur-md bg-card/90 rounded-lg p-3 border border-border shadow-lg w-full animate-fade-in">
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
        </div>
      )}

      {unlocked && (
        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Upplåst via referens</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Marknadspriset visas. Köp rapporten för fullständig analys med förhandlingstips.
          </p>
        </div>
      )}
    </div>
  );
}
