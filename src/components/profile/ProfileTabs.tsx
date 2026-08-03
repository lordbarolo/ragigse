import { User, Briefcase, ShieldCheck, Bookmark } from "lucide-react";

export type ProfileTab = "overview" | "work" | "creds" | "saved";

interface Props {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}

const TABS: { key: ProfileTab; label: string; icon: typeof User; color: string }[] = [
  { key: "overview", label: "Översikt", icon: User, color: "text-foreground" },
  { key: "work", label: "Arbete", icon: Briefcase, color: "text-rose-600 dark:text-rose-400" },
  { key: "creds", label: "Verifieringar", icon: ShieldCheck, color: "text-amber-600 dark:text-amber-400" },
  
  { key: "saved", label: "Sparat", icon: Bookmark, color: "text-pink-600 dark:text-pink-400" },
];

export default function ProfileTabs({ active, onChange }: Props) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white border border-slate-200 shadow-xs overflow-x-auto max-w-full scrollbar-hide">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : ""}`} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
