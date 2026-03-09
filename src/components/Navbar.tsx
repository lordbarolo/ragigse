import { Link } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center px-4 md:px-6 lg:px-8 bg-[#0D111C]/80 backdrop-blur-sm border-b border-white/5">
      <Link to="/" className="flex items-center">
        <div className="block md:hidden">
          <CompcareLogo variant="wordmark" />
        </div>
        <div className="hidden md:block">
          <CompcareLogo variant="full" />
        </div>
      </Link>
      <div className="flex-1" />
    </nav>
  );
}
