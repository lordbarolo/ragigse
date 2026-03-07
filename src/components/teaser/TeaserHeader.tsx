interface Props {
  kommun: string;
}

export default function TeaserHeader({ kommun }: Props) {
  const label = "din ersättning";

  return (
    <header className="py-10 px-5 text-center border-b border-border bg-background">
      <div className="max-w-lg mx-auto">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">CompCare · Ersättningsanalys</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
          Vi har räknat. Vill du se resultatet?
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Vi har jämfört {label} med ramavtalspriserna i {kommun}
        </p>
      </div>
    </header>
  );
}
