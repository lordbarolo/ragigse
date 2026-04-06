import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CompcareLogo from "@/components/CompcareLogo";
import { Button } from "@/components/ui/button";
import { User, LogIn, LogOut, MessageSquare, Shield, FileSearch, ArrowLeft } from "lucide-react";

const CONSULTANT_LINKS = [
  { to: "/consultant/forhandla", label: "Marknadsvillkor", icon: MessageSquare },
  { to: "/consultant/referenser", label: "Referenser", icon: Shield },
] as const;

const AGENCY_LINKS = [
  { to: "/agency/dashboard", label: "Dashboard", icon: FileSearch },
] as const;

export default function Navbar() {
  const { user, loading, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const links = role === "agency" ? AGENCY_LINKS : CONSULTANT_LINKS;
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 lg:px-8 bg-[hsl(var(--background))]/80 backdrop-blur-sm border-b border-border/20" role="navigation" aria-label="Huvudnavigation">
      {!isHome && (
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors mr-2"
          aria-label="Gå tillbaka"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
      <Link to="/" className="flex items-center" aria-label="CompCare startsida">
        <div className="block md:hidden">
          <CompcareLogo variant="wordmark" />
        </div>
        <div className="hidden md:block">
          <CompcareLogo variant="full" />
        </div>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {/* Role-specific nav links */}
        {links.map((link) => (
          <Link key={link.to} to={link.to}>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <link.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{link.label}</span>
            </Button>
          </Link>
        ))}

        {!loading && (
          user ? (
            <>
              {role !== "agency" && (
                <Link to="/consultant/profil">
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Min profil</span>
                  </Button>
                </Link>
              )}
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={signOut}>
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logga ut</span>
              </Button>
            </>
          ) : (
            <Link to="/logga-in">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
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
