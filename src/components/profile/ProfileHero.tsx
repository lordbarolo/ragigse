import { Link } from "react-router-dom";
import { Briefcase, MapPin, Users, Share2, Download, Pencil, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  name: string;
  email: string;
  role?: string | null;
  location?: string | null;
  connections?: number;
  completedCount: number;
  totalCount: number;
  onShare?: () => void;
}

/**
 * Shiftnex-inspired profile hero with CompCare's purple spotlight background.
 * Renders: gradient cover, avatar with initials, name + meta row, action buttons,
 * and an inline profile completeness bar.
 */
export default function ProfileHero({
  name,
  email,
  role,
  location,
  connections = 0,
  completedCount,
  totalCount,
  onShare,
}: Props) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || "")
    .join("") || email.slice(0, 2).toUpperCase();

  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const remaining = totalCount - completedCount;

  const hook =
    percent >= 100
      ? "Din profil är komplett — du syns för alla matchande byråer."
      : percent >= 70
        ? `Bara ${remaining} steg kvar för att maximera din synlighet hos byråer.`
        : "Komplettera din profil för att synas för byråer som söker din kompetens.";

  return (
    <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm">
      {/* Cover with purple spotlight (matches /logga-in) */}
      <div className="relative h-56 sm:h-64 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 75% 30%, rgba(110,95,230,0.55) 0%, rgba(90,78,210,0.25) 25%, rgba(70,60,190,0.08) 50%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
          }}
        />
        <button
          type="button"
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/15 backdrop-blur text-white text-xs font-medium hover:bg-white/25 transition-colors"
        >
          <Camera className="w-3.5 h-3.5" />
          Ändra omslag
        </button>
      </div>

      {/* Identity row */}
      <div className="px-4 sm:px-6 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12 pt-6 sm:pt-10">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border-4 border-card flex items-center justify-center shadow-md ring-1 ring-border">
              <span className="text-2xl sm:text-3xl font-semibold text-primary">{initials}</span>
            </div>
            <button
              type="button"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 border-2 border-card flex items-center justify-center transition-colors"
              aria-label="Byt profilbild"
            >
              <Camera className="w-3.5 h-3.5 text-primary" />
            </button>
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs sm:text-sm text-muted-foreground">
              {role && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  {role}
                </span>
              )}
              {location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {connections} kopplingar
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/profil">
              <Button size="sm" className="gap-1.5 h-9">
                <Pencil className="w-3.5 h-3.5" />
                Redigera
              </Button>
            </Link>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={onShare} aria-label="Dela profil">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Ladda ner profil">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Completeness inline */}
        <div className="mt-5 rounded-xl bg-muted/40 px-3.5 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs sm:text-sm font-medium text-foreground">Profilstatus</p>
            <span className="text-xs sm:text-sm font-semibold text-primary">{percent}%</span>
          </div>
          <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 leading-relaxed">{hook}</p>
        </div>
      </div>
    </div>
  );
}
