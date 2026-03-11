import { BarChart3, Target, FileText, TrendingUp, MessageSquare, MapPin } from "lucide-react";

interface Props {
  isPermanent: boolean;
  yrke: string;
}

const CONSULTANT_ITEMS = [
  {
    icon: BarChart3,
    title: "Ramavtalspris",
    desc: "Vad regionen betalar bemanningsföretaget för din roll och zon",
  },
  {
    icon: Target,
    title: "Rekommenderad ersättning",
    desc: "Ditt förhandlingsspann baserat på aktuella marknadspriser",
  },
  {
    icon: TrendingUp,
    title: "Lönegap-analys",
    desc: "Hur din nuvarande ersättning förhåller sig till marknaden",
  },
  {
    icon: MapPin,
    title: "Zonjämförelse",
    desc: "Se hur ersättningen varierar mellan olika zoner",
  },
  {
    icon: MessageSquare,
    title: "Förhandlingsscript",
    desc: "Steg-för-steg — exakt vad du ska säga i lönesamtalet",
  },
];

const PERMANENT_ITEMS = [
  {
    icon: BarChart3,
    title: "Lönestatistik",
    desc: "Percentiler (P25, P50, P75) från Medlingsinstitutet",
  },
  {
    icon: Target,
    title: "Din löneposition",
    desc: "Se exakt var du ligger jämfört med kollegor i samma sektor",
  },
  {
    icon: TrendingUp,
    title: "Lönegap-analys",
    desc: "Hur mycket mer du kan tjäna baserat på officiell statistik",
  },
  {
    icon: FileText,
    title: "Konsultjämförelse",
    desc: "Vad du hade tjänat som konsult i samma roll och kommun",
  },
  {
    icon: MessageSquare,
    title: "Förhandlingsguide",
    desc: "Konkreta argument och tips inför lönesamtalet",
  },
];

export default function ReportPreviewList({ isPermanent, yrke }: Props) {
  const items = isPermanent ? PERMANENT_ITEMS : CONSULTANT_ITEMS;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Det här ingår i din rapport
      </h3>

      <div className="space-y-3">
        {items.map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
