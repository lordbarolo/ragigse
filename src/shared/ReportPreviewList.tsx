import { ShieldCheck } from "lucide-react";

const ITEMS = [
  "Kunskap om vad regionen betalar för dig",
  "Konkret förhandlingsspann med siffror",
  "Steg-för-steg script: vad du ska säga",
  "Info om orter som betalar mer än din nuvarande",
];

export default function ReportPreviewList({ isPermanent }: { isPermanent: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card card-shadow p-6">
      <h3 className="text-base font-bold text-foreground mb-4">I din rapport får du:</h3>
      <ul className="space-y-3 text-sm">
        {ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
