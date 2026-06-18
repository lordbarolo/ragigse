import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CompcareLogo from "@/components/CompcareLogo";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut, MessageSquare, Shield, FileSearch, ArrowLeft } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 lg:px-8 bg-[#F7F5FB]/85 backdrop-blur-md border-b border-slate-200/70 text-slate-900" role="navigation" aria-label="Huvudnavigation">
      {!isHome && (
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-200/70 transition-colors mr-2"
          aria-label="Gå tillbaka"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
      )}
      <Link to="/" className="flex items-center" aria-label="CompCare startsida">
        <div className="block md:hidden">
          <CompcareLogo variant="wordmark" inverted={false} />
        </div>
        <div className="hidden md:block">
          <CompcareLogo variant="full" inverted={false} />
        </div>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {/* Role-specific nav links */}
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60">
              <link.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Button>
          </Link>
        ))}

        {!loading && (
          user ? (
            <>
              <Link to={role === "agency" ? "/agency" : "/consultant/profil"} aria-label="Min profil">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Min profil</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" onClick={signOut} aria-label="Logga ut">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logga ut</span>
              </Button>
            </>
          ) : (
            <Link to="/logga-in" aria-label="Logga in">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Logga in</span>
              </Button>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
