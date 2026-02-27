import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const CONSULTANT_ITEMS = [
  "Exakt beräknad bruttolön baserat på ramavtal",
  "Konkret förhandlingsspann med siffror",
  "Steg-för-steg script: vad du ska säga",
  "Lista på godkända leverantörer",
];

const PERMANENT_ITEMS = [
  "Exakt förhandlingsutrymme mot marknadens P75",
  "Konkreta förhandlingsargument anpassade för dig",
  "Jämförelse mot medianen och toppskiktet",
  "Se vad konsulter i samma roll tjänar",
];

export default function ReportPreviewList({ isPermanent }: { isPermanent: boolean }) {
  const items = isPermanent ? PERMANENT_ITEMS : CONSULTANT_ITEMS;

  return (
    <Card className="card-shadow">
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-display text-lg text-foreground">I din rapport får du:</h3>
        <ul className="space-y-2 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
