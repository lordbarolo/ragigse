interface Props {
  kommun: string;
  employmentType?: string;
}

export default function TeaserHeader({ kommun, employmentType }: Props) {
  const label = employmentType === "foretagare" ? "din ersättning" : "din lön";

  return (
    <header className="py-10 px-5 text-center border-b border-border">
      <div className="max-w-lg mx-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">CompCare · Löneanalys</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
          Din löneanalys är klar
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Vi har jämfört {label} med ramavtalspriserna i {kommun}
        </p>
      </div>
    </header>
  );
}
