import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { User, LogIn, MessageSquare } from "lucide-react";

export default function Navbar() {
  const { user, loading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 lg:px-8 bg-[hsl(var(--background))]/80 backdrop-blur-sm border-b border-border/20">
      <Link to="/" className="flex items-center">
        <div className="block md:hidden">
          <CompcareLogo variant="wordmark" />
        </div>
        <div className="hidden md:block">
          <CompcareLogo variant="full" />
        </div>
      </Link>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Link to="/forhandla">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Förhandla</span>
          </Button>
        </Link>
        {!loading && (
          user ? (
            <Link to="/profil">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Min profil</span>
              </Button>
            </Link>
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