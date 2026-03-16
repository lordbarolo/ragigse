interface Props {
  isUnderpaid: boolean;
  diffPercent: number;
  isPermanent: boolean;
  yrke: string;
  kommun: string;
  nearestHigherKommun?: string | null;
  isAboveThreshold?: boolean;
  emailProvided?: boolean;
}

export default function EarningsBanner({
  isUnderpaid, diffPercent, isPermanent, yrke, kommun, nearestHigherKommun, isAboveThreshold, emailProvided = false,
}: Props) {
  const blurClass = !emailProvided ? "blur-md select-none" : "";

  if (isPermanent) {
    if (!isUnderpaid || diffPercent <= 0) return null;
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-body-sm font-medium">
          Enligt officiell lönestatistik kan du tjäna
        </p>
        <p className={`text-3xl sm:text-4xl font-extrabold text-foreground mt-2 tracking-tight ${blurClass}`}>
          {diffPercent}% mer
        </p>
        <p className="text-hint mt-2">
          Baserat på Medlingsinstitutets lönestatistik för {yrke}
        </p>
      </div>
    );
  }

  if (isAboveThreshold) {
    return (
      <div className="rounded-lg border border-primary/20 bg-card p-6 text-center card-shadow">
        <p className="text-foreground text-base font-semibold leading-relaxed">
          Du ligger redan i toppskiktet i {kommun}.
        </p>
        <p className="text-body-sm mt-2">
          Se hur du kan öka din totala ersättning via andra zoner, jour och reseersättning.
        </p>
      </div>
    );
  }

  if (isUnderpaid && diffPercent > 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-body-sm font-medium">
          Baserat på ramavtalspriserna i {kommun} kan du tjäna
        </p>
        <p className={`text-3xl sm:text-4xl font-extrabold text-foreground mt-2 tracking-tight ${blurClass}`}>
          {diffPercent}% mer
        </p>
        <p className="text-body-sm mt-2">
          Vill du se exakta belopp och få förhandlingstips?
        </p>
      </div>
    );
  }

  if (!isUnderpaid && nearestHigherKommun) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center card-shadow">
        <p className="text-foreground text-base font-semibold leading-relaxed">
          Din ersättning i {kommun} är nära vad regionen betalar — men
          i {nearestHigherKommun} betalas mer.
        </p>
        <p className="text-body-sm mt-2">
          Vill du veta hur mycket och få förhandlingstips?
        </p>
      </div>
    );
  }

  return null;
}
