import { Link } from "@/lib/router-compat";
import { ArrowRight, ClipboardList, FileSearch, BookOpen, Table2 } from "lucide-react";
import { getRelatedPages, RELATED_PAGE_BY_SLUG } from "@/data/relatedContent";
import { trackEvent } from "@/lib/trackEvent";

/**
 * Innehållsmodul: relaterade rollsidor, kontextlänkar och CTA.
 * Ren presentationskomponent — priser och marginalmodeller hämtas inte här.
 * Beskrivande länktexter (ingen "Läs mer") för internlänkning och semantisk kontext.
 */

interface RelateradeSidorProps {
  /** Rapport-slug för sidan modulen ligger på, t.ex. "lakare-kardiolog". */
  currentSlug: string;
  /** Slug för prefill mot startformuläret (?yrke=…). */
  prefillSlug: string;
  /** Visa guide-länken. Default: bara på läkarsidor. */
  showGuideLink?: boolean;
  /** Antal relaterade rollsidor (3–4). */
  limit?: number;
  className?: string;
}

const INK = "#ffffff";
const SUB = "#8a8c94";
const BORDER = "#22232b";
const CARD = "#121319";
const ICON_BG = "#22232b1A";

const cardClass = "block rounded-2xl border p-5 transition hover:shadow-xs";
const cardStyle = { backgroundColor: CARD, borderColor: BORDER } as const;
const labelClass = "text-[10px] font-semibold tracking-[1.4px] uppercase px-1";

export default function RelateradeSidor({
  currentSlug,
  prefillSlug,
  showGuideLink,
  limit = 4,
  className,
}: RelateradeSidorProps) {
  const related = getRelatedPages(currentSlug, limit);
  const current = RELATED_PAGE_BY_SLUG[currentSlug];
  const withGuide = showGuideLink ?? (current?.kind ?? "lakare") === "lakare";

  const track = (to: string, kind: "role" | "context" | "cta") =>
    trackEvent("related_link_clicked", { from: currentSlug, to, kind });

  return (
    <section className={`space-y-2.5 pt-2 ${className ?? ""}`}>
      <h2 className={labelClass} style={{ color: SUB }}>
        Relaterade roller och underlag
      </h2>

      {related.map((page) => (
        <Link
          key={page.slug}
          to={page.path}
          className={cardClass}
          style={cardStyle}
          onClick={() => track(page.path, "role")}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: INK }}>
                {page.linkText}
              </p>
              <p className="text-sm mt-1" style={{ color: SUB }}>
                {page.blurb}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: INK }} />
          </div>
        </Link>
      ))}

      {withGuide && (
        <Link
          to="/guide/hyrlakare-lon-2026"
          className={cardClass}
          style={cardStyle}
          onClick={() => track("/guide/hyrlakare-lon-2026", "context")}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ICON_BG }}>
              <BookOpen className="w-5 h-5" style={{ color: INK }} />
            </div>
            <div className="flex-1">
              <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: INK }}>
                Guide: hyrläkare lön 2026 – timpris per specialitet och zon
              </p>
              <p className="text-sm mt-1" style={{ color: SUB }}>
                Samlad genomgång av ramavtalspriserna för 14 läkarspecialiteter och hur marginalen påverkar din ersättning.
              </p>
            </div>
            <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: INK }} />
          </div>
        </Link>
      )}

      <Link
        to="/faktasidor"
        className={cardClass}
        style={cardStyle}
        onClick={() => track("/faktasidor", "context")}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ICON_BG }}>
            <Table2 className="w-5 h-5" style={{ color: INK }} />
          </div>
          <div className="flex-1">
            <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: INK }}>
              Prisöversikt: ramavtalspriser för alla vårdroller och orter
            </p>
            <p className="text-sm mt-1" style={{ color: SUB }}>
              Sök fram ramavtalspriset för din roll och uppdragets ort ur SKR:s ramavtal 2026.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: INK }} />
        </div>
      </Link>

      <Link
        to={`/?yrke=${prefillSlug}`}
        className={cardClass}
        style={cardStyle}
        onClick={() => track(`/?yrke=${prefillSlug}`, "cta")}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ICON_BG }}>
            <ClipboardList className="w-5 h-5" style={{ color: INK }} />
          </div>
          <div className="flex-1">
            <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: INK }}>
              Personlig rapport
            </p>
            <p className="text-sm mt-1" style={{ color: SUB }}>
              Få en rapport baserad på din kommun, anställningsform och nuvarande ersättning.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: INK }} />
        </div>
      </Link>

      <Link
        to={`/?yrke=${prefillSlug}&fokus=lonekoll`}
        className={cardClass}
        style={cardStyle}
        onClick={() => track(`/?yrke=${prefillSlug}&fokus=lonekoll`, "cta")}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: ICON_BG }}>
            <FileSearch className="w-5 h-5" style={{ color: INK }} />
          </div>
          <div className="flex-1">
            <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: INK }}>
              Lönekoll
            </p>
            <p className="text-sm mt-1" style={{ color: SUB }}>
              Jämför din nuvarande ersättning mot ramavtalets spann i din zon.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: INK }} />
        </div>
      </Link>
    </section>
  );
}
