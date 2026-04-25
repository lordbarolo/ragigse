import { BarChart3, Target, TrendingUp, MessageSquare, MapPin } from "lucide-react";

interface Props {
  yrke: string;
}

export const CONSULTANT_ITEMS = [
  {
    icon: BarChart3,
    title: "Möjlig ersättningsnivå",
    desc: "",
  },
  {
    icon: Target,
    title: "Skillnad mot marknadsspannet",
    desc: "",
  },
  {
    icon: TrendingUp,
    title: "Vad betalar grannregionerna",
    desc: "",
  },
  {
    icon: MapPin,
    title: "Förhandlingsargument",
    desc: "",
  },
  {
    icon: MessageSquare,
    title: "Bemanningsföretagets verkliga marginal",
    desc: "",
  },
];

export default function ReportPreviewList({ yrke }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Det här ingår i din rapport
      </h3>

      <div className="space-y-3">
        {CONSULTANT_ITEMS.map(({ icon: Icon, title, desc }, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
              {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
