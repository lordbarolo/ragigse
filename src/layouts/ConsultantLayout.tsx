import { Outlet } from "@/lib/router-compat";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/radar/BottomNav";

export default function ConsultantLayout() {
  // Onboarding-enkäten bor numera i profilsidans assistentchatt — ingen
  // tvingande omdirigering till /onboarding.
  return (
    <div className="min-h-screen bg-background" data-layout="consultant">
      <Navbar />
      <main className="pt-14 md:pt-16 pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

