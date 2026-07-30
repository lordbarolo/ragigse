import { SearchX } from "lucide-react";

export default function RadarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <SearchX className="w-10 h-10 text-muted-foreground/40 mb-4" />
      <p className="text-[15px] font-medium text-foreground mb-1">
        Inga mönster hittades
      </p>
      <p className="text-[13px] text-muted-foreground max-w-[280px]">
        Vi hittar inga tydliga historiska mönster för ditt val just nu. Prova en annan ort, kompetens eller beställare.
      </p>
    </div>
  );
}
