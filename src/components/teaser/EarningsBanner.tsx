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
  if (isPermanent) {
    if (!isUnderpaid || diffPercent <= 0) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-muted-foreground text-sm font-medium">
          Enligt officiell lönestatistik kan du tjäna
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold text-foreground mt-2 tracking-tight">
          upp till {diffPercent}% mer
        </p>
        <p className="text-muted-foreground text-xs mt-2">
          Baserat på Medlingsinstitutets lönestatistik för {yrke}
        </p>
      </div>
    );
  }

  if (isUnderpaid && diffPercent > 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-foreground text-base font-semibold leading-relaxed">
          I {kommun} kan du tjäna mer än du gör idag.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Vill du se exakta belopp och få förhandlingstips?
        </p>
      </div>
    );
  }

  if (!isUnderpaid && nearestHigherKommun) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-foreground text-base font-semibold leading-relaxed">
          Din ersättning i {kommun} är nära marknadspriset — men
          i {nearestHigherKommun} betalas mer.
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Vill du veta hur mycket och få förhandlingstips?
        </p>
      </div>
    );
  }

  return null;
}
