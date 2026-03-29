import { Outlet } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";

export default function PublicVerifyLayout() {
  return (
    <div className="min-h-screen bg-background" data-layout="public-verify">
      {/* Minimal header — logo only, no navigation */}
      <header className="h-14 flex items-center px-6 border-b border-border/30">
        <CompcareLogo variant="full" />
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-border/30 py-6 text-center text-xs text-muted-foreground">
        <p>CompCare · Verifieringsinfrastruktur för vården</p>
      </footer>
    </div>
  );
}
