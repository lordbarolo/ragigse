import { Stethoscope, MapPin } from "lucide-react";

interface Props {
  yrke: string;
  kommun: string;
}

export default function OccupationInfo({ yrke, kommun }: Props) {
  return (
    <div className="flex items-center gap-3 text-sm border border-border rounded-lg px-4 py-2.5 bg-card card-shadow">
      <Stethoscope className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="font-medium text-foreground">{yrke}</span>
      <span className="text-border">·</span>
      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="font-medium text-foreground">{kommun}</span>
    </div>
  );
}
