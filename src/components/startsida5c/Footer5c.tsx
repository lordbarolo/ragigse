import { Link } from "@/lib/router-compat";

const LINKS = [
  { to: "/faktasidor", label: "Faktasidor" },
  { to: "/vanliga-fragor", label: "Vanliga frågor" },
  { to: "/integritetspolicy", label: "Integritetspolicy" },
  { to: "/logga-in", label: "Logga in" },
];

export default function Footer5c() {
  return (
    <footer style={{ background: "#f5f5f7", borderTop: "1px solid #e3e3e8" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-12">
        <img
          src="/vardbemanning-lockup-dark.svg"
          alt="vårdbemanning.ai"
          className="h-5 w-auto select-none"
          draggable={false}
        />

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]" style={{ color: "#4a4b52" }}>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-[12.5px]" style={{ color: "#6b6b6b" }}>
          © 2026 vårdbemanning.ai · Data lagras inom EU
        </div>
      </div>
    </footer>
  );
}
