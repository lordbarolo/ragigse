interface Props {
  isUnderpaid: boolean;
  diffPercent: number;
  isPermanent: boolean;
  yrke: string;
  kommun: string;
  employmentType?: string;
}

export default function EarningsBanner({ isUnderpaid, diffPercent, isPermanent, yrke, kommun, employmentType }: Props) {
  if (!isUnderpaid || diffPercent <= 0) return null;

  return (
    <div className="hero-gradient rounded-2xl p-5 text-center card-shadow">
      <p className="text-primary-foreground/80 text-sm font-medium">
        {isPermanent
          ? "Enligt officiell lönestatistik kan du tjäna"
          : employmentType === "foretagare"
            ? "Enligt ramavtalen kan din ersättning vara"
            : "Enligt ramavtalen kan din lön vara"}
      </p>
      <p className="text-3xl sm:text-4xl font-bold font-display text-primary-foreground mt-1">
        upp till {diffPercent}% mer
      </p>
      <p className="text-primary-foreground/70 text-xs mt-2">
        {isPermanent
          ? `Baserat på Medlingsinstitutets lönestatistik för ${yrke}`
          : `Baserat på offentliga ramavtalspriser för ${yrke} i ${kommun}`}
      </p>
    </div>
  );
}
