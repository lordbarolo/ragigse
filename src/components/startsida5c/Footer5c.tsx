import { Link } from "@/lib/router-compat";

const LINKS = [
  { to: "/faktasidor", label: "Faktasidor" },
  { to: "/vanliga-fragor", label: "Vanliga frågor" },
  { to: "/integritetspolicy", label: "Integritetspolicy" },
  { to: "/logga-in", label: "Logga in" },
];

export default function Footer5c() {
  return (
    <footer style={{ background: "#0b0c10" }}>
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-12">
        <img
          src="/vardbemanning-lockup-light.svg"
          alt="vardbemanning.ai"
          className="h-5 w-auto select-none"
          draggable={false}
        />

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[14px]" style={{ color: "#b8bac2" }}>
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-[12.5px]" style={{ color: "#a1a3ab" }}>
          © 2026 vardbemanning.ai · Data lagras inom EU
        </div>
      </div>
    </footer>
  );
}
