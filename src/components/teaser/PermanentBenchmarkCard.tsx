import { BarRow } from "@/shared/UIComponents";
import type { BenchmarkMonthly } from "@/shared/types";

interface Props {
  userMonthly: number;
  benchmarkMonthly: BenchmarkMonthly;
  unlocked: boolean;
  partialUnlocked: boolean;
}

export default function PermanentBenchmarkCard({ userMonthly, benchmarkMonthly, unlocked, partialUnlocked }: Props) {
  return (
    <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden p-5">
      <div className="space-y-4">
        <BarRow label="Din nuvarande månadslön" value={userMonthly} max={benchmarkMonthly.p75 + 5000} color="bg-muted-foreground/30" />
        <BarRow label="Median (P50) för din yrkesgrupp" value={benchmarkMonthly.p50} max={benchmarkMonthly.p75 + 5000} color="bg-primary" />
        <BarRow label="Övre kvartil (P75) — ditt mål" value={benchmarkMonthly.p75} max={benchmarkMonthly.p75 + 5000} color="bg-primary/60" blurred={!unlocked && !partialUnlocked} partialReveal={partialUnlocked && !unlocked} />
      </div>
    </div>
  );
}
