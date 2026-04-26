import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CompcareLogo from "@/components/CompcareLogo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/agency/dashboard", icon: LayoutDashboard },
  { label: "Market Edge", path: "/agency/market-edge", icon: Activity },
  { label: "Samarbetsintyg", path: "/agency/intyg", icon: ShieldCheck },
  { label: "Inställningar", path: "/agency/settings", icon: Settings },
] as const;

export default function AgencyLayout() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex" data-layout="agency">
      {/* ── Sidebar (desktop) ────────────────── */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-border">
          <Link to="/agency/dashboard">
            <CompcareLogo variant="full" />
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1" aria-label="Agency navigation">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4" />
            Logga ut
          </Button>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border bg-card">
          <Link to="/agency/dashboard">
            <CompcareLogo variant="wordmark" />
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="md:hidden border-b border-border bg-card px-4 py-3 space-y-1" aria-label="Agency mobile navigation">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full"
            >
              <LogOut className="w-4 h-4" />
              Logga ut
            </button>
          </nav>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
