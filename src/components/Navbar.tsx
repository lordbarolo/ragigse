import { Link, useLocation, useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/hooks/useAuth";
import CompcareLogo from "@/components/CompcareLogo";
import BadgeCta from "@/components/startsida5c/BadgeCta";
import { Button } from "@/components/ui/button";
import { User, LogOut, MessageSquare, Shield, FileSearch, ArrowLeft } from "lucide-react";
import { trackCta } from "@/lib/trackCta";

const CONSULTANT_LINKS: ReadonlyArray<{ to: string; label: string; icon: typeof User }> = [];

const AGENCY_LINKS: ReadonlyArray<{ to: string; label: string; icon: typeof User }> = [];

export default function Navbar() {
  const { user, loading, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = role === "agency" ? AGENCY_LINKS : CONSULTANT_LINKS;
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 lg:px-8 bg-[#0b0c10]/85 backdrop-blur-md border-b border-[#22232b] text-white" role="navigation" aria-label="Huvudnavigation">
      {!isHome && (
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors mr-2"
          aria-label="Gå tillbaka"
        >
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </button>
      )}
      <Link to="/" className="flex items-center" aria-label="vårdbemanning.ai startsida">
        <div className="block md:hidden">
          <CompcareLogo variant="wordmark" inverted />
        </div>
        <div className="hidden md:block">
          <CompcareLogo variant="full" inverted />
        </div>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {/* Role-specific nav links */}
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            <Button variant="ghost" size="sm" className="gap-2 text-white/70 hover:text-white hover:bg-white/10">
              <link.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Button>
          </Link>
        ))}

        {!loading && (
          user ? (
            <>
              <Link
                to={role === "agency" ? "/agency" : "/consultant/profil"}
                aria-label="Min profil"
                onClick={() => trackCta("app_navbar", "Min profil", role === "agency" ? "/agency" : "/consultant/profil")}
              >
                <Button variant="ghost" size="sm" className="gap-2 text-white/70 hover:text-white hover:bg-white/10">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Min profil</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => { trackCta("app_navbar", "Logga ut", "sign_out"); signOut(); }}
                aria-label="Logga ut"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logga ut</span>
              </Button>
            </>
          ) : (
            <Link to="/logga-in" onClick={() => trackCta("app_navbar", "Logga in", "/logga-in")}>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-white/70 hover:text-white hover:bg-white/10"
                aria-label="Logga in"
              >
                Logga in
              </Button>
            </Link>

          )
        )}
      </div>
    </nav>
  );
}
