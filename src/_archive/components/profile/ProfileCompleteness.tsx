interface Props {
  /** Number of completed fields */
  completed: number;
  /** Total number of fields */
  total: number;
}

export default function ProfileCompleteness({ completed, total }: Props) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = total - completed;

  // Hook copy varies based on completion level
  const hook =
    percent >= 100
      ? "Din profil är komplett — du syns för alla matchande byråer."
      : percent >= 70
        ? `Bara ${remaining} steg kvar för att maximera din synlighet hos byråer.`
        : percent >= 30
          ? "Komplett profil ökar matchning från byråer markant."
          : "Komplettera din profil för att synas för byråer som söker din kompetens.";

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Profilstatus</p>
        <span className="text-sm font-semibold text-primary">{percent}%</span>
      </div>

      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{hook}</p>
    </div>
  );
}
