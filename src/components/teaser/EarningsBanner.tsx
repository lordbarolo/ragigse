interface Props {
  isUnderpaid: boolean;
  diffPercent: number;
  isPermanent: boolean;
  yrke: string;
  kommun: string;
  employmentType?: string;
  nearestHigherKommun?: string | null;
}

export default function EarningsBanner({
  isUnderpaid, diffPercent, isPermanent, yrke, kommun, employmentType, nearestHigherKommun,
}: Props) {
  // Permanent track — keep original behaviour
  if (isPermanent) {
    if (!isUnderpaid || diffPercent <= 0) return null;
    return (
      <div className="hero-gradient rounded-2xl p-5 text-center card-shadow">
        <p className="text-primary-foreground/80 text-sm font-medium">
          Enligt officiell lönestatistik kan du tjäna
        </p>
        <p className="text-3xl sm:text-4xl font-bold font-display text-primary-foreground mt-1">
          upp till {diffPercent}% mer
        </p>
        <p className="text-primary-foreground/70 text-xs mt-2">
          Baserat på Medlingsinstitutets lönestatistik för {yrke}
        </p>
      </div>
    );
  }

  // Consultant track — Variant 1: under 90% of ramavtalspris
  if (isUnderpaid && diffPercent > 0) {
    return (
      <div className="hero-gradient rounded-2xl p-5 text-center card-shadow">
        <p className="text-primary-foreground text-base font-medium leading-relaxed">
          I {kommun} kan du tjäna mer än du gör idag.
        </p>
        <p className="text-primary-foreground/70 text-sm mt-2">
          Vill du se exakta belopp och få förhandlingstips?
        </p>
      </div>
    );
  }

  // Consultant track — Variant 2: near/above 90%, higher kommun exists
  if (!isUnderpaid && nearestHigherKommun) {
    return (
      <div className="hero-gradient rounded-2xl p-5 text-center card-shadow">
        <p className="text-primary-foreground text-base font-medium leading-relaxed">
          Din ersättning i {kommun} är nära marknadspriset — men
          i {nearestHigherKommun} betalas mer.
        </p>
        <p className="text-primary-foreground/70 text-sm mt-2">
          Vill du veta hur mycket och få förhandlingstips?
        </p>
      </div>
    );
  }

  return null;
}
