import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { User } from "lucide-react";

const HIDDEN_PREFIXES = [
  "/consultant/profil",
  "/logga-in",
  "/registrera",
  "/glomt-losenord",
  "/aterstall-losenord",
  "/delade-dokument",
  "/samarbetsintyg",
  "/dokhus",
  "/profil/",
  "/kampanj",
];

/**
 * Liten flytande knapp som låter inloggade användare snabbt återgå till sin profil
 * från valfri vy. Visas inte på själva profilen eller publika/anonyma vyer.
 */
export default function FloatingProfileButton() {
  const { user, role, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading || !user) return null;
  if (role === "agency") return null;
  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname === p.replace(/\/$/, ""))) {
    return null;
  }
  if (pathname === "/consultant/profil") return null;

  return (
    <Link
      to="/consultant/profil"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full text-white shadow-lg bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] transition-all"
      aria-label="Tillbaka till min profil"
    >
      <User className="w-4 h-4" />
      <span className="hidden sm:inline">Min profil</span>
    </Link>
  );
}
