import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "@/lib/router-compat";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/radar/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";

export default function ConsultantLayout() {
  const { user, loading: authLoading } = useAuth();
  const { complete, loading: profileLoading } = useProfileContext(user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  // Obligatorisk onboarding: saknas roll/ort/kontraktsform/ersättning styrs
  // användaren till enkäten innan resten av appen blir tillgänglig.
  useEffect(() => {
    if (authLoading || profileLoading || !user || complete) return;
    if (location.pathname.startsWith("/onboarding")) return;
    navigate(`/onboarding?redirect=${encodeURIComponent(location.pathname)}`);
  }, [authLoading, profileLoading, user, complete, location.pathname, navigate]);

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
