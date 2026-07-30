import { Info, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Beräkningsmetod – kollapsbar list som visar hur CompCare räknar.
 * Används både på teasersidan och rapportsidan (rapportsidan har även
 * den detaljerade EmployerCostBreakdown-tabellen ovanpå denna).
 */
export default function MethodologyDisclosure({
  variant = "teaser",
}: {
  variant?: "teaser" | "report";
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-xl bg-foreground/[0.03] border border-border/30 hover:bg-foreground/[0.05] transition-colors">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Så räknar vi
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-2">
          <h4 className="font-semibold text-foreground">Källor</h4>
          <p>
            Kundpriserna kommer från SKR:s nationella ramavtal (2024 och 2026)
            samt regionernas avropsförfaranden. Vi använder aldrig SCB eller
            Medlingsinstitutet för konsultersättning.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold text-foreground">Marginalmodell</h4>
          <p>
            Bemanningsbolagets marginal sätts utifrån roll och anställningsform:
            specialistläkare 10–15 % (konsult 85–90 %), övriga roller 15–20 %
            (konsult 80–85 %). Spannet täcker administration, risk och
            vitesåtagande.
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold text-foreground">Anställd – stegfunktion</h4>
          <p>
            För anställda räknar vi arbetsgivarkostnaden post för post i stället
            för en schablon × 1,38:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Bruttolön (semesterersättning inkluderad)</li>
            <li>Arbetsgivaravgifter 31,42 %</li>
            <li>
              ITP 1: 4,5 % under brytpunkten 7,5 IBB (52&nbsp;750 kr/mån 2025),
              30 % över brytpunkten
            </li>
            <li>Särskild löneskatt på pension 24,26 %</li>
            <li>AFA/TFA-försäkringar ca 0,85 %</li>
          </ul>
          <p className="text-xs">
            Modellen utgår från person född 1979 eller senare (ITP 1).
          </p>
        </section>

        <section className="space-y-2">
          <h4 className="font-semibold text-foreground">Arbetsmånad</h4>
          <p>
            Månadsberäkningar baseras på 167 arbetstimmar. OB, jour och
            beredskap fakturas separat och ingår inte i grundpriset.
          </p>
        </section>

        {variant === "teaser" && (
          <p className="text-xs pt-2 border-t border-border/30">
            I den fullständiga rapporten visas en exakt arbetsgivarkostnad i
            kr/h och procent för just din lönenivå.
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
