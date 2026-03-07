import { ShieldCheck } from "lucide-react";

const CONSULTANT_ITEMS = [
  "Ersättningen för de bäst betalda konsulterna",
  "Konkret förhandlingsspann med siffror",
  "Steg-för-steg script: vad du ska säga",
  "Få ett färdigt förhandlingsscript",
  "Lista på godkända leverantörer",
];

const PERMANENT_ITEMS = [
  "Exakt förhandlingsutrymme mot marknadens P75",
  "Konkreta förhandlingsargument anpassade för dig",
  "Jämförelse mot medianen och toppskiktet",
  "Få ett färdigt förhandlingsscript",
  "Se vad konsulter i samma roll tjänar",
];

export default function ReportPreviewList({ isPermanent }: { isPermanent: boolean }) {
  const items = isPermanent ? PERMANENT_ITEMS : CONSULTANT_ITEMS;

  return (
    <div className="rounded-lg border border-border bg-card card-shadow p-6">
      <h3 className="text-base font-bold text-foreground mb-4">I din rapport får du:</h3>
      <ul className="space-y-3 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
