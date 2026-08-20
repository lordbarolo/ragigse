import { useEffect, useState } from "react";
import { FileText, LayoutGrid, User } from "lucide-react";

const ITEMS = [
  { id: "profil", label: "Profil", icon: User },
  { id: "cv", label: "CV", icon: FileText },
  { id: "verktyg", label: "Verktyg", icon: LayoutGrid },
] as const;

/**
 * Sidofält för profilsidan (app-skal). Ankarlänkar till sidans sektioner,
 * markerar aktiv sektion vid scroll. Faller tillbaka till en vågrät rad på mobil.
 */
export default function ProfileSideNav() {
  const [active, setActive] = useState<string>(ITEMS[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    for (const item of ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Mobil: vågrät, scrollbar rad */}
      <nav
        aria-label="Profilnavigering"
        className="sticky top-0 z-20 mb-2 w-full border-b border-white/10 bg-[#0b0c10]/95 px-5 py-3 backdrop-blur lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto">
          {ITEMS.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? "true" : undefined}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active === item.id
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/10 text-white/55 hover:text-white"
                }`}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop: sticky sidofält */}
      <nav
        aria-label="Profilnavigering"
        className="hidden shrink-0 lg:block lg:w-[188px]"
      >
        <div className="sticky top-24 py-14">
          <p className="px-3 text-[11px] uppercase tracking-[0.16em] text-white/35">Min profil</p>
          <ul className="mt-3 space-y-0.5">
            {ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={active === item.id ? "true" : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                    active === item.id
                      ? "bg-white/10 text-white"
                      : "text-white/50 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
