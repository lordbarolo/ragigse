import { useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, Radio, Shield, User } from "lucide-react";

const TABS = [
  { label: "Marknadsvillkor", path: "/forhandla", icon: MessageSquare },
  { label: "Uppdrag", path: "/radar", icon: Radio },
  { label: "Referenser", path: "/referenser", icon: Shield },
  { label: "Profil", path: "/profil", icon: User },
] as const;

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
