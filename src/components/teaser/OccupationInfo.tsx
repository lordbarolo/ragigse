import { Stethoscope, MapPin } from "lucide-react";

interface Props {
  yrke: string;
  kommun: string;
}

export default function OccupationInfo({ yrke, kommun }: Props) {
  return (
    <div className="flex items-center gap-3 text-sm bg-muted/50 border border-border rounded-lg px-4 py-2.5">
      <Stethoscope className="w-4 h-4 text-primary shrink-0" />
      <span className="font-medium text-foreground">{yrke}</span>
      <span className="text-muted-foreground">·</span>
      <MapPin className="w-4 h-4 text-primary shrink-0" />
      <span className="font-medium text-foreground">{kommun}</span>
    </div>
  );
}
