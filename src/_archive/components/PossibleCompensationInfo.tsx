import { Info } from "lucide-react";

interface Props {
  variant?: "teaser" | "report";
  className?: string;
}

/**
 * Förklarar begreppet "möjlig ersättning" och visar disclaimer om
 * individuella förutsättningar. Används på teaser- och rapportsidan.
 *
 * Definition och disclaimer används också av förhandlingsassistenten
 * vid relaterade frågor — håll texten synkad med
 * supabase/functions/salary-negotiation-agent/index.ts.
 */
export default function PossibleCompensationInfo({ variant = "report", className }: Props) {
  return (
    <div
      className={`rounded-xl border p-5 ${className ?? ""}`}
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E0DBD3" }}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: "rgba(61,52,145,0.10)" }}>
          <Info className="w-4 h-4" style={{ color: "#3D3491" }} />
        </div>
        <div className="space-y-2">
          <h3
            className="font-semibold leading-tight"
            style={{ fontFamily: "Georgia, serif", fontSize: variant === "report" ? "18px" : "16px", color: "#0A0A0A" }}
          >
            Vad är möjlig ersättning?
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: "#0A0A0A" }}>
            Den ersättning som kan betalas till konsulten utifrån vad kunden betalar
            enligt ramavtal och bemanningsbranschens standardmarginaler.
          </p>
          <p className="text-xs leading-relaxed pt-1" style={{ color: "#6B7280" }}>
            Individuella förutsättningar så som resekostnader, utbildning, introduktion,
            boende m.m. kan påverka ersättningen. Be din uppdragsgivare att vara
            transparent kring vilka kostnader som uppdraget medför.
          </p>
        </div>
      </div>
    </div>
  );
}
