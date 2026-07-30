import { Link } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";

const REPORT_LINKS = [
  { to: "/rapport/sjukskoterska", label: "Legitimerad sjuksköterska" },
  { to: "/rapport/anestesisjukskoterska", label: "Anestesisjuksköterska" },
  { to: "/rapport/lakare-allmanmedicin", label: "Läkare i allmänmedicin" },
];

export default function SiteFooter() {
  const specialtyLinks = DOCTOR_SPECIALTY_REPORTS.slice(0, 5);

  return (
    <footer className="mt-16 border-t border-black/10 bg-transparent px-5 sm:px-6 lg:px-10 pt-12 pb-8">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          {/* Logotyp */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" aria-label="CompCare startsida" className="inline-flex items-center text-black">
              <CompcareLogo variant="full" inverted={false} />
            </Link>
            <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-black/60">
              Ersättningsanalys för vårdkonsulter, baserad på regionernas offentliga ramavtalspriser.
            </p>
          </div>

          {/* Fakta och råd */}
          <nav aria-labelledby="footer-fakta">
            <h2 id="footer-fakta" className="text-sm font-semibold text-black mb-3">
              Fakta och råd
            </h2>
            <ul className="space-y-2 text-sm text-black/70">
              <li>
                <Link to="/faktasidor" className="hover:text-black underline-offset-4 hover:underline">
                  Faktasidor
                </Link>
              </li>
              <li>
                <Link to="/vanliga-fragor" className="hover:text-black underline-offset-4 hover:underline">
                  Frågor och svar
                </Link>
              </li>
              {REPORT_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="hover:text-black underline-offset-4 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Läkarspecialiteter */}
          <nav aria-labelledby="footer-specialiteter">
            <h2 id="footer-specialiteter" className="text-sm font-semibold text-black mb-3">
              Läkarspecialiteter
            </h2>
            <ul className="space-y-2 text-sm text-black/70">
              {specialtyLinks.map((r) => (
                <li key={r.slug}>
                  <Link to={`/rapport/${r.slug}`} className="hover:text-black underline-offset-4 hover:underline">
                    {r.shortLabel ?? r.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/faktasidor" className="hover:text-black underline-offset-4 hover:underline">
                  Alla priser och roller
                </Link>
              </li>
            </ul>
          </nav>

          {/* Om CompCare */}
          <nav aria-labelledby="footer-om">
            <h2 id="footer-om" className="text-sm font-semibold text-black mb-3">
              Om CompCare
            </h2>
            <ul className="space-y-2 text-sm text-black/70">
              <li>
                <Link to="/logga-in" className="hover:text-black underline-offset-4 hover:underline">
                  Logga in
                </Link>
              </li>
              <li>
                <Link to="/registrera" className="hover:text-black underline-offset-4 hover:underline">
                  Skapa konto
                </Link>
              </li>
              <li>
                <a href="mailto:info@compcare.se" className="hover:text-black underline-offset-4 hover:underline">
                  info@compcare.se
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Underrad */}
        <div className="mt-10 border-t border-black/10 pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-black/55">
          <nav className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/integritetspolicy" className="hover:text-black underline-offset-4 hover:underline">
              Integritetspolicy
            </Link>
            <Link to="/vanliga-fragor" className="hover:text-black underline-offset-4 hover:underline">
              Vanliga frågor
            </Link>
            <Link to="/faktasidor" className="hover:text-black underline-offset-4 hover:underline">
              Faktasidor
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} CompCare</p>
        </div>
      </div>
    </footer>
  );
}
