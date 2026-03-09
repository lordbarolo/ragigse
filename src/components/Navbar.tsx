import { Link } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";

export default function Navbar() {
  return (
    <nav className="h-14 md:h-16 px-4 md:px-6 lg:px-8 flex items-center bg-background/80 backdrop-blur-sm border-b border-border">
      <Link to="/" className="flex items-center">
        <span className="block md:hidden"><CompcareLogo variant="wordmark" /></span>
        <span className="hidden md:block"><CompcareLogo variant="full" /></span>
      </Link>
    </nav>
  );
}
